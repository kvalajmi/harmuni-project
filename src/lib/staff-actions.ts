'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Service key must be set in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

console.log('[DEBUG] Initializing supabaseAdmin:', {
    hasUrl: !!supabaseUrl,
    urlStart: supabaseUrl?.substring(0, 30) + '...',
    hasServiceKey: !!serviceKey,
    keyStart: serviceKey?.substring(0, 10) + '...',
    nodeEnv: process.env.NODE_ENV
})

if (!supabaseUrl || !serviceKey) {
    console.error('[ERROR] Missing Supabase credentials:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey
    })
}

const supabaseAdmin = createClient(
    supabaseUrl!,
    serviceKey!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// ============== STAFF MANAGEMENT ==============

export interface CreateEmployeeInput {
    fullName: string
    email: string
    password: string
    role: 'admin' | 'member'
    groupId?: string
}

export interface Employee {
    id: string
    full_name: string | null
    email: string
    role: string
    created_at: string
    groups: { id: string; name: string }[]
    is_active: boolean
    deactivated_at: string | null
}

export async function createEmployeeAction(input: CreateEmployeeInput): Promise<{ success: boolean; error?: string }> {
    try {
        const { fullName, email, password, role, groupId } = input

        // 1. Create auth user
        const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        })

        if (authError) {
            if (authError.message.includes('already been registered')) {
                return { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً' }
            }
            return { success: false, error: authError.message }
        }

        // 2. Update profile with role
        await supabaseAdmin.from('profiles').upsert({
            id: userData.user.id,
            full_name: fullName,
            role
        })

        // 3. Add to group if specified
        if (groupId) {
            await supabaseAdmin.from('group_members').insert({
                group_id: groupId,
                user_id: userData.user.id
            })
        }

        revalidatePath('/dashboard/staff')
        return { success: true }

    } catch (error) {
        console.error('Create employee error:', error)
        return { success: false, error: 'حدث خطأ غير متوقع' }
    }
}

export async function getEmployeesAction(): Promise<Employee[]> {
    try {
        console.log('[DEBUG] getEmployeesAction - Starting fetch')
        console.log('[DEBUG] Environment check:', {
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
            nodeEnv: process.env.NODE_ENV,
            url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
        })

        // Get profiles directly (NO listUsers!) 🚀
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, created_at, is_active, deactivated_at')

        console.log('[DEBUG] Profiles query result:', {
            hasData: !!profiles,
            profileCount: profiles?.length || 0,
            error: profilesError?.message || null,
            sampleProfile: profiles?.[0] ? { id: profiles[0].id.substring(0, 8) + '...', name: profiles[0].full_name } : null
        })

        if (profilesError) {
            console.error('[ERROR] Profiles query failed:', profilesError)
            return []
        }

        // Get group memberships with group names
        const { data: memberships, error: membershipsError } = await supabaseAdmin
            .from('group_members')
            .select('user_id, group:groups(id, name)')

        console.log('[DEBUG] Memberships query result:', {
            hasData: !!memberships,
            membershipCount: memberships?.length || 0,
            error: membershipsError?.message || null
        })

        const groupMap = new Map<string, { id: string; name: string }[]>()

        memberships?.forEach(m => {
            const existing = groupMap.get(m.user_id) || []
            const group = m.group as unknown as { id: string; name: string } | null
            if (group && group.id && group.name) {
                existing.push({ id: group.id, name: group.name })
            }
            groupMap.set(m.user_id, existing)
        })

        const result = profiles?.map(p => ({
            id: p.id,
            full_name: p.full_name || null,
            email: '', // Email removed for performance
            role: p.role || 'member',
            created_at: p.created_at,
            groups: groupMap.get(p.id) || [],
            is_active: p.is_active ?? true,
            deactivated_at: p.deactivated_at || null
        })) || []

        console.log('[DEBUG] getEmployeesAction - Final result:', {
            employeeCount: result.length,
            firstEmployee: result[0] ? { id: result[0].id.substring(0, 8) + '...', name: result[0].full_name } : null
        })

        return result

    } catch (error) {
        console.error('[ERROR] Get employees exception:', error)
        console.error('[ERROR] Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
        return []
    }
}

// Employee with task/circular statistics
export interface EmployeeWithStats extends Employee {
    stats: {
        totalTasks: number
        activeTasks: number
        completedTasks: number
        circularsCount: number
    }
}

export async function getEmployeesWithStatsAction(): Promise<EmployeeWithStats[]> {
    try {
        // PARALLEL loading for speed! 🚀
        const [profilesResult, membershipsResult, assignmentsResult, circularRecipientsResult] = await Promise.all([
            supabaseAdmin.from('profiles').select('id, full_name, role, created_at, is_active, deactivated_at'),
            supabaseAdmin.from('group_members').select('user_id, group:groups(id, name)'),
            supabaseAdmin.from('task_assignments').select('user_id, status'),
            supabaseAdmin.from('circular_recipients').select('user_id')
        ])

        const profiles = profilesResult.data || []
        const memberships = membershipsResult.data || []
        const assignments = assignmentsResult.data || []
        const circularRecipients = circularRecipientsResult.data || []

        const groupMap = new Map<string, { id: string; name: string }[]>()

        memberships.forEach(m => {
            const existing = groupMap.get(m.user_id) || []
            const group = m.group as unknown as { id: string; name: string } | null
            if (group && group.id && group.name) {
                existing.push({ id: group.id, name: group.name })
            }
            groupMap.set(m.user_id, existing)
        })

        // Calculate stats per user
        const statsMap = new Map<string, { totalTasks: number; activeTasks: number; completedTasks: number }>()
        assignments.forEach(a => {
            const existing = statsMap.get(a.user_id) || { totalTasks: 0, activeTasks: 0, completedTasks: 0 }
            existing.totalTasks++
            if (a.status === 'pending' || a.status === 'in_progress') {
                existing.activeTasks++
            } else if (a.status === 'completed') {
                existing.completedTasks++
            }
            statsMap.set(a.user_id, existing)
        })

        // Calculate circular count per user
        const circularCountMap = new Map<string, number>()
        circularRecipients.forEach(r => {
            circularCountMap.set(r.user_id, (circularCountMap.get(r.user_id) || 0) + 1)
        })

        return profiles.map(p => ({
            id: p.id,
            full_name: p.full_name || null,
            email: '', // Email removed for performance
            role: p.role || 'member',
            created_at: p.created_at,
            groups: groupMap.get(p.id) || [],
            is_active: p.is_active ?? true,
            deactivated_at: p.deactivated_at || null,
            stats: {
                totalTasks: statsMap.get(p.id)?.totalTasks || 0,
                activeTasks: statsMap.get(p.id)?.activeTasks || 0,
                completedTasks: statsMap.get(p.id)?.completedTasks || 0,
                circularsCount: circularCountMap.get(p.id) || 0
            }
        }))

    } catch (error) {
        console.error('Get employees with stats error:', error)
        return []
    }
}

export async function deleteEmployeeAction(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        revalidatePath('/dashboard/staff')
        return { success: true }
    } catch (error) {
        console.error('Delete employee error:', error)
        return { success: false, error: 'فشل في حذف الموظف' }
    }
}

// ============== TASK MANAGEMENT ==============

export interface TaskDetails {
    id: string
    title: string
    description: string | null
    status: 'open' | 'completed'
    created_at: string
    is_archived: boolean
    created_by: string
    creator_name: string | null
    assignments: TaskAssignmentDetails[]
}

export interface TaskAssignmentDetails {
    id: string
    user_id: string
    user_name: string | null
    user_email: string
    status: string
    response_note: string | null
    assigned_at: string
    updated_at: string
}

export async function getTaskDetailsAction(taskId: string): Promise<TaskDetails | null> {
    try {
        // Get task with creator info AND assignments in ONE query! 🚀
        const { data: task, error: taskError } = await supabaseAdmin
            .from('tasks')
            .select(`
                *,
                creator:profiles!tasks_created_by_fkey(full_name),
                task_assignments(id, user_id, status, response_note, assigned_at, updated_at, user:profiles(full_name))
            `)
            .eq('id', taskId)
            .single()

        if (taskError || !task) return null

        const assignments = (task.task_assignments as any[]) || []

        return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status || 'open',
            created_at: task.created_at,
            is_archived: task.is_archived,
            created_by: task.created_by,
            creator_name: task.creator?.full_name,
            assignments: assignments.map(a => ({
                id: a.id,
                user_id: a.user_id,
                user_name: a.user?.full_name || 'مستخدم',
                user_email: '', // Email removed for performance
                status: a.status,
                response_note: a.response_note,
                assigned_at: a.assigned_at,
                updated_at: a.updated_at
            }))
        }

    } catch (error) {
        console.error('Get task details error:', error)
        return null
    }
}

export async function updateAssignmentStatusAction(
    assignmentId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'rejected'
): Promise<{ success: boolean }> {
    try {
        await supabaseAdmin
            .from('task_assignments')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', assignmentId)

        revalidatePath('/dashboard/tasks')
        return { success: true }
    } catch (error) {
        console.error('Update status error:', error)
        return { success: false }
    }
}

export async function getCreatedTasksAction(userId: string): Promise<{ id: string; title: string; created_at: string; assignment_count: number; pending_count: number; completed_count: number }[]> {
    try {
        const { data: tasks } = await supabaseAdmin
            .from('tasks')
            .select('id, title, created_at')
            .eq('created_by', userId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })

        if (!tasks) return []

        // Get all assignments with status
        const { data: assignments } = await supabaseAdmin
            .from('task_assignments')
            .select('task_id, status')
            .in('task_id', tasks.map(t => t.id))

        const countMap = new Map<string, { total: number; pending: number; completed: number }>()
        assignments?.forEach(a => {
            const existing = countMap.get(a.task_id) || { total: 0, pending: 0, completed: 0 }
            existing.total++
            if (a.status === 'pending' || a.status === 'in_progress') {
                existing.pending++
            } else if (a.status === 'completed') {
                existing.completed++
            }
            countMap.set(a.task_id, existing)
        })

        return tasks.map(t => ({
            ...t,
            assignment_count: countMap.get(t.id)?.total || 0,
            pending_count: countMap.get(t.id)?.pending || 0,
            completed_count: countMap.get(t.id)?.completed || 0
        }))
    } catch (error) {
        console.error('Get created tasks error:', error)
        return []
    }
}

// Get admin tasks with all assignments details
export interface AdminTaskWithAssignments {
    id: string
    title: string
    description: string | null
    created_at: string
    assignments: {
        id: string
        user_id: string
        employee_name: string
        employee_email: string
        status: 'pending' | 'in_progress' | 'completed' | 'rejected'
        completed_at: string | null
    }[]
}

export async function getAdminTasksWithAssignmentsAction(userId: string): Promise<AdminTaskWithAssignments[]> {
    try {
        // ONE query with joins - no listUsers! 🚀
        const { data: tasks, error: tasksError } = await supabaseAdmin
            .from('tasks')
            .select(`
                id, title, description, created_at,
                task_assignments(id, user_id, status, updated_at, user:profiles(full_name))
            `)
            .eq('created_by', userId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })

        if (tasksError || !tasks) return []

        return tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            created_at: t.created_at,
            assignments: ((t.task_assignments as any[]) || []).map(a => ({
                id: a.id,
                user_id: a.user_id,
                employee_name: a.user?.full_name || 'غير معروف',
                employee_email: '', // Email removed for performance
                status: a.status as 'pending' | 'in_progress' | 'completed' | 'rejected',
                completed_at: a.updated_at
            }))
        }))
    } catch (error) {
        console.error('Get admin tasks with assignments error:', error)
        return []
    }
}

// Admin marks an assignment as completed
export async function adminMarkAssignmentCompleteAction(assignmentId: string): Promise<{ success: boolean }> {
    try {
        const { error } = await supabaseAdmin
            .from('task_assignments')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', assignmentId)

        if (error) {
            console.error('Admin mark complete DB error:', error)
            return { success: false }
        }

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Admin mark complete error:', error)
        return { success: false }
    }
}

// ============== COMMENTS ==============

export interface TaskComment {
    id: string
    user_id: string
    user_name: string | null
    user_role: string
    content: string
    created_at: string
}

export async function getTaskCommentsAction(taskId: string): Promise<TaskComment[]> {
    try {
        const { data: comments, error } = await supabaseAdmin
            .from('task_comments')
            .select('id, user_id, content, created_at')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true })

        if (error || !comments) return []

        // Get user profiles
        const userIds = [...new Set(comments.map(c => c.user_id))]
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .in('id', userIds)

        const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, role: p.role }]) || [])

        return comments.map(c => ({
            id: c.id,
            user_id: c.user_id,
            user_name: profileMap.get(c.user_id)?.name || 'مستخدم',
            user_role: profileMap.get(c.user_id)?.role || 'member',
            content: c.content,
            created_at: c.created_at
        }))
    } catch (error) {
        console.error('Get comments error:', error)
        return []
    }
}

export async function addTaskCommentAction(taskId: string, userId: string, content: string): Promise<{ success: boolean }> {
    try {
        const { error } = await supabaseAdmin
            .from('task_comments')
            .insert({
                task_id: taskId,
                user_id: userId,
                content
            })

        if (error) {
            console.error('Add comment error:', error)
            return { success: false }
        }

        // Send push notification to relevant users
        try {
            // Get sender profile
            const { data: senderProfile } = await supabaseAdmin
                .from('profiles')
                .select('full_name, role')
                .eq('id', userId)
                .single()

            // Get task info
            const { data: task } = await supabaseAdmin
                .from('tasks')
                .select('title, created_by')
                .eq('id', taskId)
                .single()

            // Get task assignments
            const { data: assignments } = await supabaseAdmin
                .from('task_assignments')
                .select('user_id')
                .eq('task_id', taskId)

            if (task && senderProfile) {
                const senderName = senderProfile.full_name || 'مستخدم'
                const isAdmin = senderProfile.role === 'admin'

                // Determine who should receive the notification
                let recipientIds: string[] = []

                if (isAdmin) {
                    // Admin sent message → notify all assigned users
                    recipientIds = assignments?.map(a => a.user_id).filter(id => id !== userId) || []
                } else {
                    // Staff sent message → notify task creator (admin) and other assigned users
                    const allIds = [task.created_by, ...(assignments?.map(a => a.user_id) || [])]
                    recipientIds = [...new Set(allIds)].filter(id => id !== userId)
                }

                if (recipientIds.length > 0) {
                    // Import and send push notification
                    const { sendPushNotificationAction } = await import('./onesignal-server')

                    await sendPushNotificationAction({
                        userIds: recipientIds,
                        title: `رسالة جديدة - ${task.title}`,
                        body: `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                        url: `https://harmuni.org/dashboard/tasks/${taskId}`,
                        data: { taskId, type: 'comment' }
                    })
                }
            }
        } catch (pushError) {
            // Don't fail the comment if push notification fails
            console.error('Push notification error (non-blocking):', pushError)
        }

        revalidatePath(`/dashboard/tasks/${taskId}`)
        return { success: true }
    } catch (error) {
        console.error('Add comment error:', error)
        return { success: false }
    }
}

export async function updateTaskStatusAction(taskId: string, status: 'open' | 'completed'): Promise<{ success: boolean }> {
    try {
        await supabaseAdmin
            .from('tasks')
            .update({ status })
            .eq('id', taskId)

        // CRITICAL FIX: If task is completed, mark ALL assignments as completed
        if (status === 'completed') {
            await supabaseAdmin
                .from('task_assignments')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString(),
                    // We don't track completed_at in task_assignments table schema shown in previous files, 
                    // but we do update updated_at.
                    // Checking schema from getEmployeeTasksAction: 
                    // it safely handles nulls. Let's stick to status and updated_at 
                    // unless we confirm completed_at column exists in task_assignments 
                    // (It DOES allow it in updateEmployeeTaskStatusAction in employee-task-actions.ts,
                    // but that might be a different table 'employee_task_assignments'? 
                    // No, staff-actions.ts used 'task_assignments' in markAssignmentCompletedAction 
                    // and didn't set completed_at.
                    // Wait, markAssignmentCompletedAction in staff-actions.ts ONLY sets status and updated_at.
                    // Let's stick to that pattern to be safe).
                })
                .eq('task_id', taskId)
        }

        revalidatePath(`/dashboard/tasks/${taskId}`)
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/staff') // Revalidate staff lists too
        return { success: true }
    } catch (error) {
        console.error('Update task status error:', error)
        return { success: false }
    }
    export async function updateTaskStatusAction(taskId: string, status: 'open' | 'completed'): Promise<{ success: boolean }> {
        try {
            await supabaseAdmin
                .from('tasks')
                .update({ status })
                .eq('id', taskId)

            // CRITICAL FIX: Ensure assignments sync with main task status
            if (status === 'completed') {
                await supabaseAdmin
                    .from('task_assignments')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('task_id', taskId)
            } else if (status === 'open') {
                // Re-open: Reset completed/in_progress assignments to 'pending' (new)
                // This forces employees to see it as a new task again
                await supabaseAdmin
                    .from('task_assignments')
                    .update({
                        status: 'pending',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('task_id', taskId)
            }

            revalidatePath(`/dashboard/tasks/${taskId}`)
            revalidatePath('/dashboard')
            revalidatePath('/dashboard/staff')
            return { success: true }
        } catch (error) {
            console.error('Update task status error:', error)
            return { success: false }
        }
    }

    // NEW ACTION: Explicitly reopen task and sync assignments
    export async function reopenTaskWithSyncAction(taskId: string): Promise<{ success: boolean }> {
        try {
            console.log('[Sync] Reopening task:', taskId)

            // 1. Reopen the main task
            const { error: taskError } = await supabaseAdmin
                .from('tasks')
                .update({ status: 'open' })
                .eq('id', taskId)

            if (taskError) throw taskError

            // 2. Reset ALL assignments to pending
            const { error: assignError, count } = await supabaseAdmin
                .from('task_assignments')
                .update({
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('task_id', taskId)
                .select('id', { count: 'exact' })

            console.log('[Sync] Reopen: Updated assignments:', count)

            if (assignError) throw assignError

            revalidatePath(`/dashboard/tasks/${taskId}`)
            revalidatePath('/dashboard')
            revalidatePath('/dashboard/staff')

            return { success: true }
        } catch (error) {
            console.error('Reopen task sync error:', error)
            return { success: false }
        }
    }

    // NEW ACTION: Explicitly close task and sync assignments (Force Sync)
    export async function closeTaskWithSyncAction(taskId: string): Promise<{ success: boolean }> {
        try {
            console.log('[Sync] Closing task:', taskId)

            // 1. Close the main task
            const { error: taskError } = await supabaseAdmin
                .from('tasks')
                .update({ status: 'completed' })
                .eq('id', taskId)

            if (taskError) throw taskError

            // 2. Close ALL assignments
            const { error: assignError, count } = await supabaseAdmin
                .from('task_assignments')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('task_id', taskId)
                .select('id', { count: 'exact' })

            console.log('[Sync] Implementation: Updated assignments:', count)

            if (assignError) throw assignError

            revalidatePath(`/dashboard/tasks/${taskId}`)
            revalidatePath('/dashboard')
            revalidatePath('/dashboard/staff') // Revalidate staff lists too

            return { success: true }
        } catch (error) {
            console.error('Close task sync error:', error)
            return { success: false }
        }
    }

    // Mark assignment as in_progress (employee accepts task)
    export async function markAssignmentInProgressAction(assignmentId: string): Promise<{ success: boolean }> {
        try {
            await supabaseAdmin
                .from('task_assignments')
                .update({
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', assignmentId)

            revalidatePath('/dashboard')
            revalidatePath('/dashboard/staff')
            return { success: true }
        } catch (error) {
            console.error('Mark assignment in progress error:', error)
            return { success: false }
        }
    }

    // ============== ASSIGNED TASKS (for Staff Dashboard) ==============

    export interface AssignedTask {
        id: string
        task_id: string
        user_id: string
        status: string
        response_note: string | null
        assigned_at: string
        updated_at: string
        task: {
            id: string
            title: string
            description: string | null
            created_at: string
            is_archived: boolean
        } | null
    }

    export async function getAssignedTasksAction(userId: string): Promise<AssignedTask[]> {
        try {
            console.log('[DEBUG] getAssignedTasksAction - Starting for user:', userId?.substring(0, 8) + '...')

            // Step 1: Get all task assignments for this user
            const { data: assignments, error } = await supabaseAdmin
                .from('task_assignments')
                .select(`
                id,
                task_id,
                user_id,
                status,
                response_note,
                assigned_at,
                updated_at,
                task:tasks(id, title, description, created_at, is_archived)
            `)
                .eq('user_id', userId)
                .order('assigned_at', { ascending: false })

            console.log('[DEBUG] Assigned tasks query result:', {
                userId: userId?.substring(0, 8) + '...',
                hasData: !!assignments,
                assignmentCount: assignments?.length || 0,
                error: error?.message || null,
                firstAssignment: assignments?.[0] ? {
                    id: assignments[0].id.substring(0, 8) + '...',
                    taskId: assignments[0].task_id?.substring(0, 8) + '...',
                    status: assignments[0].status
                } : null
            })

            if (error) {
                console.error('[ERROR] Get assigned tasks error:', error)
                return []
            }

            // Step 2: Filter out null tasks and archived tasks
            const result = (assignments || [])
                .filter(a => {
                    const task = a.task as unknown as { id: string; is_archived: boolean } | null
                    return task !== null && task !== undefined && task.is_archived === false
                })
                .map(a => ({
                    ...a,
                    task: a.task as unknown as AssignedTask['task']
                }))

            console.log('[DEBUG] getAssignedTasksAction - Final result:', {
                userId: userId?.substring(0, 8) + '...',
                filteredCount: result.length,
                originalCount: assignments?.length || 0
            })

            return result
        } catch (error) {
            console.error('[ERROR] Get assigned tasks exception:', error)
            console.error('[ERROR] Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
            return []
        }
    }

    export async function getNotificationsAction(userId: string): Promise<{
        id: string
        user_id: string
        message: string
        related_task_id: string | null
        is_read: boolean
        created_at: string
    }[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) {
                console.error('Get notifications error:', error)
                return []
            }

            return data || []
        } catch (error) {
            console.error('Get notifications error:', error)
            return []
        }
    }

    export async function markNotificationReadAction(notificationId: string): Promise<{ success: boolean }> {
        try {
            await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)

            return { success: true }
        } catch (error) {
            console.error('Mark notification read error:', error)
            return { success: false }
        }
    }

    // ============== EMPLOYEE PROFILE ==============

    export interface EmployeeProfile {
        id: string
        full_name: string | null
        email: string
        role: string
        created_at: string
        groups: { id: string; name: string }[]
    }

    export interface EmployeeTask {
        id: string
        task_id: string
        user_id: string
        task_title: string
        task_description: string | null
        status: string
        assigned_at: string
        updated_at: string
        completed_at: string | null
        reminder_sent_at: string | null
        response_note: string | null
        comments: {
            id: string
            content: string
            user_name: string
            user_role: string
            created_at: string
        }[]
    }

    export interface EmployeeCircular {
        id: string
        circular_id: string
        title: string
        content: string
        is_read: boolean
        read_at: string | null
        created_at: string
        sender_name: string
    }

    export interface EmployeeProfileData {
        profile: EmployeeProfile
        activeTasks: EmployeeTask[]
        completedTasks: EmployeeTask[]
        circulars: EmployeeCircular[]
        stats: {
            activeCount: number
            completedCount: number
            circularCount: number
            unreadCircularCount: number
        }
    }

    // Get employee tasks only (for lazy loading)
    export async function getEmployeeTasksAction(employeeId: string): Promise<{ activeTasks: EmployeeTask[], completedTasks: EmployeeTask[] }> {
        try {
            const { data: assignments } = await supabaseAdmin
                .from('task_assignments')
                .select(`
                id, task_id, user_id, status, response_note, assigned_at, updated_at, reminder_sent_at,
                task:tasks(id, title, description, created_at)
            `)
                .eq('user_id', employeeId)
                .order('assigned_at', { ascending: false })

            if (!assignments) return { activeTasks: [], completedTasks: [] }

            // Get comments for all tasks
            const taskIds = assignments.map(a => a.task_id)
            const { data: allComments } = taskIds.length > 0
                ? await supabaseAdmin
                    .from('task_comments')
                    .select('id, task_id, user_id, content, created_at')
                    .in('task_id', taskIds)
                    .order('created_at', { ascending: true })
                : { data: [] }

            // Get commenter profiles
            const commenterIds = [...new Set((allComments || []).map(c => c.user_id))]
            const { data: commenterProfiles } = commenterIds.length > 0
                ? await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, role')
                    .in('id', commenterIds)
                : { data: [] }

            const commenterMap = new Map((commenterProfiles || []).map(p => [p.id, { name: p.full_name, role: p.role }]))

            // Group comments by task
            const commentsByTask = new Map<string, typeof allComments>()
                ; (allComments || []).forEach(c => {
                    const existing = commentsByTask.get(c.task_id) || []
                    existing.push(c)
                    commentsByTask.set(c.task_id, existing)
                })

            // Process tasks
            const activeTasks: EmployeeTask[] = []
            const completedTasks: EmployeeTask[] = []

            assignments.forEach(a => {
                const task = a.task as unknown as { id: string; title: string; description: string | null; created_at: string } | null
                if (!task) return

                const taskComments = commentsByTask.get(a.task_id) || []
                const employeeTask: EmployeeTask = {
                    id: a.id,
                    task_id: a.task_id,
                    user_id: a.user_id,
                    task_title: task.title,
                    task_description: task.description,
                    status: a.status,
                    assigned_at: a.assigned_at,
                    updated_at: a.updated_at,
                    completed_at: a.status === 'completed' ? a.updated_at : null,
                    reminder_sent_at: a.reminder_sent_at,
                    response_note: a.response_note,
                    comments: taskComments.map(c => ({
                        id: c.id,
                        content: c.content,
                        user_name: commenterMap.get(c.user_id)?.name || 'مستخدم',
                        user_role: commenterMap.get(c.user_id)?.role || 'member',
                        created_at: c.created_at
                    }))
                }

                if (a.status === 'completed' || a.status === 'rejected') {
                    completedTasks.push(employeeTask)
                } else {
                    activeTasks.push(employeeTask)
                }
            })

            return { activeTasks, completedTasks }
        } catch (error) {
            console.error('Error fetching employee tasks:', error)
            return { activeTasks: [], completedTasks: [] }
        }
    }

    // Get employee circulars only (for lazy loading)
    export async function getEmployeeCircularsAction(employeeId: string): Promise<EmployeeCircular[]> {
        try {
            const { data: circularRecipients } = await supabaseAdmin
                .from('circular_recipients')
                .select(`
                id, circular_id, is_read, read_at, created_at,
                circular:circulars(id, title, content, created_by, created_at)
            `)
                .eq('user_id', employeeId)
                .order('created_at', { ascending: false })

            if (!circularRecipients) return []

            // Get sender profiles
            const senderIds = [...new Set(circularRecipients.map(r => {
                const c = r.circular as unknown as { created_by: string } | null
                return c?.created_by
            }).filter(Boolean) || [])]

            const { data: senderProfiles } = senderIds.length > 0
                ? await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', senderIds)
                : { data: [] }

            const senderMap = new Map((senderProfiles || []).map(p => [p.id, p.full_name]))

            // Process circulars
            const circulars: EmployeeCircular[] = circularRecipients.map(r => {
                const c = r.circular as unknown as { id: string; title: string; content: string | null; created_by: string; created_at: string } | null
                if (!c) return null

                return {
                    id: r.id,
                    circular_id: r.circular_id,
                    user_id: employeeId,
                    title: c.title,
                    content: c.content,
                    sender_name: senderMap.get(c.created_by) || 'Unknown',
                    is_read: r.is_read,
                    read_at: r.read_at,
                    created_at: r.created_at
                }
            }).filter(Boolean) as EmployeeCircular[]

            return circulars
        } catch (error) {
            console.error('Error fetching employee circulars:', error)
            return []
        }
    }

    // Lightweight version for initial load
    export async function getEmployeeProfileBasicAction(employeeId: string): Promise<{ profile: EmployeeProfile | null, stats: { activeTasks: number, completedTasks: number, unreadCirculars: number } | null }> {
        try {
            const { data: profileData } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, role, created_at')
                .eq('id', employeeId)
                .single()

            if (!profileData) return { profile: null, stats: null }

            // Get basic stats only (counts, no details)
            const [membershipsResult, taskStats, circularStats] = await Promise.all([
                supabaseAdmin.from('group_members').select('group:groups(id, name)').eq('user_id', employeeId),
                supabaseAdmin.from('task_assignments')
                    .select('status', { count: 'exact' })
                    .eq('user_id', employeeId),
                supabaseAdmin.from('circular_recipients')
                    .select('is_read', { count: 'exact' })
                    .eq('user_id', employeeId)
                    .eq('is_read', false)
            ])

            const groups = (membershipsResult.data || []).map(m => {
                const group = m.group as unknown as { id: string; name: string } | null
                return group ? { id: group.id, name: group.name } : null
            }).filter(Boolean) as { id: string; name: string }[]

            const profile: EmployeeProfile = {
                id: employeeId,
                full_name: profileData.full_name || null,
                email: '',
                role: profileData.role || 'member',
                created_at: profileData.created_at,
                groups
            }

            // Calculate stats from the data
            const taskData = taskStats.data || []
            const activeTasks = taskData.filter(t => t.status === 'pending' || t.status === 'in_progress').length
            const completedTasks = taskData.filter(t => t.status === 'completed').length
            const unreadCirculars = circularStats.count || 0

            return {
                profile,
                stats: {
                    activeTasks,
                    completedTasks,
                    unreadCirculars
                }
            }
        } catch (error) {
            console.error('Error fetching employee profile basic:', error)
            return { profile: null, stats: null }
        }
    }

    export async function getEmployeeProfileAction(employeeId: string): Promise<EmployeeProfileData | null> {
        try {
            // STEP 1: Get profile first (to check if exists)
            const { data: profileData } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, role, created_at')
                .eq('id', employeeId)
                .single()

            if (!profileData) return null

            // STEP 2: PARALLEL loading for all data! 🚀
            const [membershipsResult, assignmentsResult, circularsResult] = await Promise.all([
                supabaseAdmin.from('group_members').select('group:groups(id, name)').eq('user_id', employeeId),
                supabaseAdmin.from('task_assignments').select(`
                id, task_id, user_id, status, response_note, assigned_at, updated_at, reminder_sent_at,
                task:tasks(id, title, description, created_at)
            `).eq('user_id', employeeId).order('assigned_at', { ascending: false }),
                supabaseAdmin.from('circular_recipients').select(`
                id, circular_id, is_read, read_at, created_at,
                circular:circulars(id, title, content, created_by, created_at)
            `).eq('user_id', employeeId).order('created_at', { ascending: false })
            ])

            const memberships = membershipsResult.data || []
            const assignments = assignmentsResult.data || []
            const circularRecipients = circularsResult.data || []

            // Process groups
            const groups = memberships.map(m => {
                const group = m.group as unknown as { id: string; name: string } | null
                return group ? { id: group.id, name: group.name } : null
            }).filter(Boolean) as { id: string; name: string }[]

            const profile: EmployeeProfile = {
                id: employeeId,
                full_name: profileData.full_name || null,
                email: '',
                role: profileData.role || 'member',
                created_at: profileData.created_at,
                groups
            }

            // STEP 3: Get comments and sender profiles in parallel
            const taskIds = assignments.map(a => a.task_id)
            const senderIds = [...new Set(circularRecipients.map(r => {
                const c = r.circular as unknown as { created_by: string } | null
                return c?.created_by
            }).filter(Boolean) || [])]

            const [commentsResult, senderProfilesResult] = await Promise.all([
                taskIds.length > 0
                    ? supabaseAdmin.from('task_comments').select('id, task_id, user_id, content, created_at').in('task_id', taskIds).order('created_at', { ascending: true })
                    : Promise.resolve({ data: [] }),
                senderIds.length > 0
                    ? supabaseAdmin.from('profiles').select('id, full_name').in('id', senderIds)
                    : Promise.resolve({ data: [] })
            ])

            const allComments = commentsResult.data || []
            const senderProfiles = senderProfilesResult.data || []

            // Get commenter profiles (if we have comments)
            const commenterIds = [...new Set(allComments.map(c => c.user_id))]
            const commenterProfiles = commenterIds.length > 0
                ? (await supabaseAdmin.from('profiles').select('id, full_name, role').in('id', commenterIds)).data || []
                : []

            const commenterMap = new Map(commenterProfiles.map(p => [p.id, { name: p.full_name, role: p.role }]))
            const senderMap = new Map(senderProfiles.map(p => [p.id, p.full_name]))

            // Group comments by task
            const commentsByTask = new Map<string, typeof allComments>()
            allComments.forEach(c => {
                const existing = commentsByTask.get(c.task_id) || []
                existing.push(c)
                commentsByTask.set(c.task_id, existing)
            })

            // Process tasks
            const activeTasks: EmployeeTask[] = []
            const completedTasks: EmployeeTask[] = []

            assignments.forEach(a => {
                const task = a.task as unknown as { id: string; title: string; description: string | null; created_at: string } | null
                if (!task) return

                const taskComments = commentsByTask.get(a.task_id) || []
                const employeeTask: EmployeeTask = {
                    id: a.id,
                    task_id: a.task_id,
                    user_id: a.user_id,
                    task_title: task.title,
                    task_description: task.description,
                    status: a.status,
                    assigned_at: a.assigned_at,
                    updated_at: a.updated_at,
                    completed_at: a.status === 'completed' ? a.updated_at : null,
                    reminder_sent_at: (a as any).reminder_sent_at || null,
                    response_note: a.response_note,
                    comments: taskComments.map(c => ({
                        id: c.id,
                        content: c.content,
                        user_name: commenterMap.get(c.user_id)?.name || 'مستخدم',
                        user_role: commenterMap.get(c.user_id)?.role || 'member',
                        created_at: c.created_at
                    }))
                }

                if (a.status === 'completed') {
                    completedTasks.push(employeeTask)
                } else {
                    activeTasks.push(employeeTask)
                }
            })

            const circulars: EmployeeCircular[] = circularRecipients?.map(r => {
                const c = r.circular as unknown as { id: string; title: string; content: string; created_by: string; created_at: string } | null
                if (!c) return null
                return {
                    id: r.id,
                    circular_id: r.circular_id,
                    title: c.title,
                    content: c.content,
                    is_read: r.is_read,
                    read_at: r.read_at,
                    created_at: r.created_at,
                    sender_name: senderMap.get(c.created_by) || 'مدير النظام'
                }
            }).filter(Boolean) as EmployeeCircular[] || []

            // 4. Calculate stats
            const stats = {
                activeCount: activeTasks.length,
                completedCount: completedTasks.length,
                circularCount: circulars.length,
                unreadCircularCount: circulars.filter(c => !c.is_read).length
            }

            return {
                profile,
                activeTasks,
                completedTasks,
                circulars,
                stats
            }

        } catch (error) {
            console.error('Get employee profile error:', error)
            return null
        }
    }

    // Mark assignment as completed (admin action)
    export async function markAssignmentCompletedAction(assignmentId: string): Promise<{ success: boolean }> {
        try {
            await supabaseAdmin
                .from('task_assignments')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', assignmentId)

            revalidatePath('/dashboard')
            return { success: true }
        } catch (error) {
            console.error('Mark assignment completed error:', error)
            return { success: false }
        }
    }

    // Send task reminder email
    export async function sendTaskReminderAction(
        assignmentId: string,
        employeeId: string,
        taskTitle: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Get employee email - getUserById instead of listUsers! 🚀
            const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(employeeId)

            if (error || !user?.email) {
                return { success: false, error: 'البريد الإلكتروني غير موجود' }
            }

            // Get employee name
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('full_name')
                .eq('id', employeeId)
                .single()

            const employeeName = profile?.full_name || 'الموظف'
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            // Import sendTaskEmail dynamically to avoid circular dependency
            const { sendTaskEmail } = await import('./email')

            // Send reminder email
            await sendTaskEmail({
                to: user.email,
                recipientName: employeeName,
                taskTitle: `تذكير: ${taskTitle}`,
                taskDescription: 'لديك مهمة معلقة تحتاج إلى إنجازها. يرجى مراجعة المهمة والرد عليها في أقرب وقت.',
                priority: 'high',
                assignerName: 'مدير النظام',
                dashboardUrl: `${appUrl}/dashboard`
            })

            // Update assignment with reminder timestamp
            await supabaseAdmin
                .from('task_assignments')
                .update({
                    reminder_sent_at: new Date().toISOString()
                })
                .eq('id', assignmentId)

            // Create notification
            await supabaseAdmin.from('notifications').insert({
                user_id: employeeId,
                message: `تذكير: لديك مهمة معلقة "${taskTitle}"`,
                is_read: false
            })

            revalidatePath('/dashboard')
            return { success: true }

        } catch (error) {
            console.error('Send task reminder error:', error)
            return { success: false, error: 'فشل في إرسال التذكير' }
        }
    }

    // ============== ACCOUNT SUSPENSION ==============

    export async function suspendAccountAction(userId: string, adminId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({
                    is_active: false,
                    deactivated_at: new Date().toISOString(),
                    deactivated_by: adminId
                })
                .eq('id', userId)

            if (error) {
                console.error('Suspend account error:', error)
                return { success: false, error: error.message }
            }

            revalidatePath('/dashboard/staff')
            return { success: true }

        } catch (error) {
            console.error('Suspend account error:', error)
            return { success: false, error: 'فشل في إيقاف الحساب' }
        }
    }

    export async function activateAccountAction(userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({
                    is_active: true,
                    deactivated_at: null,
                    deactivated_by: null
                })
                .eq('id', userId)

            if (error) {
                console.error('Activate account error:', error)
                return { success: false, error: error.message }
            }

            revalidatePath('/dashboard/staff')
            return { success: true }

        } catch (error) {
            console.error('Activate account error:', error)
            return { success: false, error: 'فشل في تنشيط الحساب' }
        }
    }

    export async function getAccountStatusAction(userId: string): Promise<{ is_active: boolean; deactivated_at: string | null }> {
        try {
            const { data } = await supabaseAdmin
                .from('profiles')
                .select('is_active, deactivated_at')
                .eq('id', userId)
                .single()

            return {
                is_active: data?.is_active ?? true,
                deactivated_at: data?.deactivated_at || null
            }
        } catch {
            return { is_active: true, deactivated_at: null }
        }
    }
