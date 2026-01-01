'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { sendTaskEmailsBatch, TaskEmailData } from './email'
import { sendPushNotificationAction } from './onesignal-server'

// Create a server-side Supabase client with service role for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q',
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export type AssignmentType = 'individual' | 'group' | 'all'
export type Priority = 'low' | 'medium' | 'high'

interface CreateTaskInput {
    title: string
    description?: string
    priority: Priority
    assignmentType: AssignmentType
    assigneeId?: string // User ID for individual, Group ID for group
    createdBy: string
}

interface CreateTaskResult {
    success: boolean
    error?: string
    taskId?: string
    assignmentCount?: number
    emailsSent?: number
}

export async function createTaskAction(input: CreateTaskInput): Promise<CreateTaskResult> {
    try {
        const { title, description, priority, assignmentType, assigneeId, createdBy } = input

        // Get assigner info for email
        const { data: assignerProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', createdBy)
            .single()

        const assignerName = assignerProfile?.full_name || 'مدير النظام'

        // 1. Create the task
        const { data: task, error: taskError } = await supabaseAdmin
            .from('tasks')
            .insert({
                title,
                description,
                created_by: createdBy,
            })
            .select()
            .single()

        if (taskError) {
            console.error('Task creation error:', taskError)
            return { success: false, error: 'فشل في إنشاء المهمة' }
        }

        // 2. Handle fan-out assignments
        let assignmentCount = 0
        const assignments: { task_id: string; user_id: string }[] = []

        if (assignmentType === 'individual' && assigneeId) {
            // Single user assignment
            assignments.push({ task_id: task.id, user_id: assigneeId })

        } else if (assignmentType === 'group' && assigneeId) {
            // Group assignment - fetch all members of the group
            const { data: members, error: membersError } = await supabaseAdmin
                .from('group_members')
                .select('user_id')
                .eq('group_id', assigneeId)

            if (membersError) {
                console.error('Error fetching group members:', membersError)
                return { success: false, error: 'فشل في جلب أعضاء المجموعة' }
            }

            // Create assignment for each member
            for (const member of members || []) {
                assignments.push({ task_id: task.id, user_id: member.user_id })
            }

        } else if (assignmentType === 'all') {
            // All staff - fetch all users
            const { data: allUsers, error: usersError } = await supabaseAdmin
                .from('profiles')
                .select('id')

            if (usersError) {
                console.error('Error fetching all users:', usersError)
                return { success: false, error: 'فشل في جلب المستخدمين' }
            }

            // Create assignment for each user
            for (const user of allUsers || []) {
                assignments.push({ task_id: task.id, user_id: user.id })
            }
        }

        // 3. Insert all assignments
        if (assignments.length > 0) {
            const { error: assignmentError } = await supabaseAdmin
                .from('task_assignments')
                .insert(assignments)

            if (assignmentError) {
                console.error('Assignment error:', assignmentError)
                return { success: false, error: 'فشل في توزيع المهمة' }
            }

            assignmentCount = assignments.length
        }

        // 4. Create notifications for assigned users
        const notifications = assignments.map(a => ({
            user_id: a.user_id,
            message: `تم تعيين مهمة جديدة لك: ${title}`,
            is_read: false
        }))

        if (notifications.length > 0) {
            await supabaseAdmin
                .from('notifications')
                .insert(notifications)
        }

        // 5. Send email notifications (async, non-blocking)
        let emailsSent = 0
        if (assignments.length > 0) {
            // Fetch user emails from auth.users using admin API
            const userIds = assignments.map(a => a.user_id)
            const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()

            // Get profiles for names
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds)

            const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])
            const userEmailMap = new Map(authUsers?.map(u => [u.id, u.email]) || [])

            const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/dashboard'

            const emailData: TaskEmailData[] = userIds
                .filter(uid => userEmailMap.get(uid)) // Only users with email
                .map(uid => ({
                    to: userEmailMap.get(uid)!,
                    recipientName: profileMap.get(uid) || 'مستخدم',
                    taskTitle: title,
                    taskDescription: description,
                    priority,
                    assignerName,
                    dashboardUrl
                }))

            if (emailData.length > 0) {
                // Send emails in background (don't wait)
                sendTaskEmailsBatch(emailData).then(result => {
                    console.log(`[Email] Batch result: ${result.sent} sent, ${result.failed} failed`)
                }).catch(err => {
                    console.error('[Email] Batch error:', err)
                })
                emailsSent = emailData.length
            }

            // 5b. Send push notifications via OneSignal
            sendPushNotificationAction({
                userIds: userIds,
                title: 'مهمة جديدة 📋',
                body: `تم تعيين مهمة لك: ${title}`,
                url: `https://opsroom.vercel.app/dashboard/tasks/${task.id}`
            }).then(result => {
                if (result.success) {
                    console.log('[Push] Notifications sent successfully')
                } else {
                    console.error('[Push] Failed:', result.error)
                }
            }).catch(err => {
                console.error('[Push] Error:', err)
            })
        }

        // 6. Revalidate paths
        revalidatePath('/dashboard')

        return {
            success: true,
            taskId: task.id,
            assignmentCount,
            emailsSent
        }

    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'حدث خطأ غير متوقع' }
    }
}

// Helper function to get users for selection
export async function getUsersAction(): Promise<{ id: string; full_name: string | null; email?: string }[]> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching users:', error)
        return []
    }

    return data || []
}

// Helper function to get groups for selection
export async function getGroupsAction(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabaseAdmin
        .from('groups')
        .select('id, name')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching groups:', error)
        return []
    }

    return data || []
}
