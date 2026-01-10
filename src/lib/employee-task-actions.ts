'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Service key for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_KEY!.trim(),
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// ============== TYPES ==============

export interface EmployeeTask {
    id: string
    title: string
    description: string | null
    created_by: string
    created_at: string
    is_closed: boolean
    closed_at: string | null
    closed_by: string | null
    priority: 'low' | 'normal' | 'high' | 'urgent'
    due_date: string | null
    creator?: {
        full_name: string | null
        role: string
    }
    assignments?: {
        user_id: string
        user_name: string | null
        status: string
        updated_at: string
    }[]
    comment_count?: number
    last_activity?: string
}

export interface EmployeeTaskAssignment {
    id: string
    task_id: string
    user_id: string
    status: 'pending' | 'in_progress' | 'completed'
    assigned_at: string
    updated_at: string
    completed_at: string | null
    user?: {
        full_name: string | null
        email: string | null
    }
}

export interface EmployeeTaskComment {
    id: string
    task_id: string
    user_id: string
    comment: string
    attachment_url: string | null
    created_at: string
    user?: {
        full_name: string | null
        role: string
    }
}

// ============== CREATE TASK ==============

export async function createEmployeeTaskAction(
    title: string,
    description: string | null,
    assignedUserIds: string[],
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    dueDate: string | null,
    creatorId: string
): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
        // 1. Create the task
        const { data: task, error: taskError } = await supabaseAdmin
            .from('employee_tasks')
            .insert({
                title,
                description,
                created_by: creatorId,
                priority,
                due_date: dueDate
            })
            .select('id')
            .single()

        if (taskError || !task) {
            console.error('Create employee task error:', taskError)
            return { success: false, error: 'فشل في إنشاء المهمة' }
        }

        // 2. Create assignments for each user
        if (assignedUserIds.length > 0) {
            const assignments = assignedUserIds.map(userId => ({
                task_id: task.id,
                user_id: userId,
                status: 'pending'
            }))

            const { error: assignError } = await supabaseAdmin
                .from('employee_task_assignments')
                .insert(assignments)

            if (assignError) {
                console.error('Create assignments error:', assignError)
            }
        }

        // 3. Log activity
        await supabaseAdmin
            .from('employee_task_activities')
            .insert({
                task_id: task.id,
                user_id: creatorId,
                action: 'created',
                details: { assigned_to: assignedUserIds }
            })

        // 4. Create notifications for assigned users
        const notifications = assignedUserIds.map(userId => ({
            user_id: userId,
            message: `لديك مهمة جديدة: ${title}`,
            related_task_id: task.id,
            is_read: false
        }))

        await supabaseAdmin
            .from('notifications')
            .insert(notifications)

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/employee-tasks')

        return { success: true, taskId: task.id }
    } catch (error) {
        console.error('Create employee task exception:', error)
        return { success: false, error: 'حدث خطأ غير متوقع' }
    }
}

// ============== GET TASKS ==============

// Get tasks for a specific user (created by them or assigned to them)
export async function getUserEmployeeTasksAction(userId: string): Promise<EmployeeTask[]> {
    try {
        // Get tasks created by user
        const { data: createdTasks } = await supabaseAdmin
            .from('employee_tasks')
            .select(`
                *,
                creator:profiles!employee_tasks_created_by_fkey(full_name, role),
                employee_task_assignments(user_id, status, updated_at, user:profiles(full_name)),
                employee_task_comments(count)
            `)
            .eq('created_by', userId)
            .order('created_at', { ascending: false })

        // Get tasks assigned to user
        const { data: assignedTasks } = await supabaseAdmin
            .from('employee_tasks')
            .select(`
                *,
                creator:profiles!employee_tasks_created_by_fkey(full_name, role),
                employee_task_assignments!inner(user_id, status, updated_at, user:profiles(full_name)),
                employee_task_comments(count)
            `)
            .eq('employee_task_assignments.user_id', userId)
            .neq('created_by', userId) // Exclude tasks already in createdTasks
            .order('created_at', { ascending: false })

        // Combine and format tasks
        const allTasks = [...(createdTasks || []), ...(assignedTasks || [])]

        // Sort by created_at and limit to 100
        const sortedTasks = allTasks
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 100)

        return sortedTasks.map(task => ({
            ...task,
            assignments: task.employee_task_assignments?.map((a: any) => ({
                user_id: a.user_id,
                user_name: a.user?.full_name,
                status: a.status,
                updated_at: a.updated_at
            })),
            comment_count: task.employee_task_comments?.[0]?.count || 0
        }))
    } catch (error) {
        console.error('Get user employee tasks exception:', error)
        return []
    }
}

// Get all employee tasks (for admin)
export async function getAllEmployeeTasksAction(): Promise<EmployeeTask[]> {
    try {
        const { data: tasks, error } = await supabaseAdmin
            .from('employee_tasks')
            .select(`
                *,
                creator:profiles!employee_tasks_created_by_fkey(full_name, role),
                employee_task_assignments(user_id, status, updated_at, user:profiles(full_name)),
                employee_task_comments(count)
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) {
            console.error('Get all employee tasks error:', error)
            return []
        }

        return (tasks || []).map(task => ({
            ...task,
            assignments: task.employee_task_assignments?.map((a: any) => ({
                user_id: a.user_id,
                user_name: a.user?.full_name,
                status: a.status,
                updated_at: a.updated_at
            })),
            comment_count: task.employee_task_comments?.[0]?.count || 0
        }))
    } catch (error) {
        console.error('Get all employee tasks exception:', error)
        return []
    }
}

// ============== GET TASK DETAILS ==============

export async function getEmployeeTaskDetailsAction(taskId: string): Promise<{
    task: EmployeeTask | null,
    assignments: EmployeeTaskAssignment[],
    comments: EmployeeTaskComment[]
}> {
    try {
        // Get task details
        const { data: task, error: taskError } = await supabaseAdmin
            .from('employee_tasks')
            .select(`
                *,
                creator:profiles!employee_tasks_created_by_fkey(full_name, role),
                closer:profiles!employee_tasks_closed_by_fkey(full_name, role)
            `)
            .eq('id', taskId)
            .single()

        if (taskError || !task) {
            console.error('Get task details error:', taskError)
            return { task: null, assignments: [], comments: [] }
        }

        // Get assignments
        const { data: assignments } = await supabaseAdmin
            .from('employee_task_assignments')
            .select(`
                *,
                user:profiles(full_name, email)
            `)
            .eq('task_id', taskId)

        // Get comments
        const { data: comments } = await supabaseAdmin
            .from('employee_task_comments')
            .select(`
                *,
                user:profiles(full_name, role)
            `)
            .eq('task_id', taskId)
            .order('created_at', { ascending: true })

        return {
            task,
            assignments: assignments || [],
            comments: comments || []
        }
    } catch (error) {
        console.error('Get task details exception:', error)
        return { task: null, assignments: [], comments: [] }
    }
}

// ============== UPDATE ASSIGNMENT STATUS ==============

export async function updateEmployeeTaskStatusAction(
    assignmentId: string,
    status: 'pending' | 'in_progress' | 'completed',
    userId: string
): Promise<{ success: boolean }> {
    try {
        // Update assignment status
        const { data, error } = await supabaseAdmin
            .from('employee_task_assignments')
            .update({
                status,
                updated_at: new Date().toISOString(),
                completed_at: status === 'completed' ? new Date().toISOString() : null
            })
            .eq('id', assignmentId)
            .eq('user_id', userId) // Ensure user can only update their own status
            .select('task_id')
            .single()

        if (error || !data) {
            console.error('Update assignment status error:', error)
            return { success: false }
        }

        // Log activity
        await supabaseAdmin
            .from('employee_task_activities')
            .insert({
                task_id: data.task_id,
                user_id: userId,
                action: 'updated_status',
                details: { new_status: status }
            })

        revalidatePath('/dashboard/employee-tasks')
        return { success: true }
    } catch (error) {
        console.error('Update assignment status exception:', error)
        return { success: false }
    }
}

// ============== ADD COMMENT ==============

export async function addEmployeeTaskCommentAction(
    taskId: string,
    userId: string,
    comment: string
): Promise<{ success: boolean }> {
    try {
        // Add comment
        const { error } = await supabaseAdmin
            .from('employee_task_comments')
            .insert({
                task_id: taskId,
                user_id: userId,
                comment
            })

        if (error) {
            console.error('Add comment error:', error)
            return { success: false }
        }

        // Log activity
        await supabaseAdmin
            .from('employee_task_activities')
            .insert({
                task_id: taskId,
                user_id: userId,
                action: 'commented'
            })

        // Get task creator and assignees for notifications
        const { data: task } = await supabaseAdmin
            .from('employee_tasks')
            .select('created_by, title')
            .eq('id', taskId)
            .single()

        const { data: assignments } = await supabaseAdmin
            .from('employee_task_assignments')
            .select('user_id')
            .eq('task_id', taskId)

        if (task) {
            // Notify all related users except the commenter
            const usersToNotify = new Set([task.created_by])
            assignments?.forEach(a => usersToNotify.add(a.user_id))
            usersToNotify.delete(userId) // Don't notify self

            const notifications = Array.from(usersToNotify).map(uid => ({
                user_id: uid,
                message: `تعليق جديد على المهمة: ${task.title}`,
                related_task_id: taskId,
                is_read: false
            }))

            if (notifications.length > 0) {
                await supabaseAdmin
                    .from('notifications')
                    .insert(notifications)
            }
        }

        revalidatePath(`/dashboard/employee-tasks/${taskId}`)
        return { success: true }
    } catch (error) {
        console.error('Add comment exception:', error)
        return { success: false }
    }
}

// ============== CLOSE TASK ==============

export async function closeEmployeeTaskAction(
    taskId: string,
    userId: string,
    isAdmin: boolean = false
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if user can close the task
        const { data: task } = await supabaseAdmin
            .from('employee_tasks')
            .select('created_by, is_closed, title')
            .eq('id', taskId)
            .single()

        if (!task) {
            return { success: false, error: 'المهمة غير موجودة' }
        }

        if (task.is_closed) {
            return { success: false, error: 'المهمة مغلقة بالفعل' }
        }

        // Only creator or admin can close
        if (!isAdmin && task.created_by !== userId) {
            return { success: false, error: 'فقط منشئ المهمة أو المدير يمكنه إغلاق المهمة' }
        }

        // Close the task
        const { error } = await supabaseAdmin
            .from('employee_tasks')
            .update({
                is_closed: true,
                closed_at: new Date().toISOString(),
                closed_by: userId
            })
            .eq('id', taskId)

        if (error) {
            console.error('Close task error:', error)
            return { success: false, error: 'فشل في إغلاق المهمة' }
        }

        // Update all assignments to completed
        await supabaseAdmin
            .from('employee_task_assignments')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('task_id', taskId)
            .neq('status', 'completed')

        // Log activity
        await supabaseAdmin
            .from('employee_task_activities')
            .insert({
                task_id: taskId,
                user_id: userId,
                action: 'closed'
            })

        // Notify all related users
        const { data: assignments } = await supabaseAdmin
            .from('employee_task_assignments')
            .select('user_id')
            .eq('task_id', taskId)

        const usersToNotify = new Set([task.created_by])
        assignments?.forEach(a => usersToNotify.add(a.user_id))
        usersToNotify.delete(userId) // Don't notify self

        const notifications = Array.from(usersToNotify).map(uid => ({
            user_id: uid,
            message: `تم إغلاق المهمة: ${task.title}`,
            related_task_id: taskId,
            is_read: false
        }))

        if (notifications.length > 0) {
            await supabaseAdmin
                .from('notifications')
                .insert(notifications)
        }

        revalidatePath('/dashboard/employee-tasks')
        return { success: true }
    } catch (error) {
        console.error('Close task exception:', error)
        return { success: false, error: 'حدث خطأ غير متوقع' }
    }
}