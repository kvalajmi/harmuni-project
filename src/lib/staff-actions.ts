'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q',
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
        // Get all auth users
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()

        // Get profiles
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, created_at, is_active, deactivated_at')

        // Get group memberships with group names
        const { data: memberships } = await supabaseAdmin
            .from('group_members')
            .select('user_id, group:groups(id, name)')

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
        const groupMap = new Map<string, { id: string; name: string }[]>()

        memberships?.forEach(m => {
            const existing = groupMap.get(m.user_id) || []
            const group = m.group as unknown as { id: string; name: string } | null
            if (group && group.id && group.name) {
                existing.push({ id: group.id, name: group.name })
            }
            groupMap.set(m.user_id, existing)
        })

        return authUsers?.map(u => ({
            id: u.id,
            full_name: profileMap.get(u.id)?.full_name || null,
            email: u.email || '',
            role: profileMap.get(u.id)?.role || 'member',
            created_at: profileMap.get(u.id)?.created_at || u.created_at,
            groups: groupMap.get(u.id) || [],
            is_active: profileMap.get(u.id)?.is_active ?? true,
            deactivated_at: profileMap.get(u.id)?.deactivated_at || null
        })) || []

    } catch (error) {
        console.error('Get employees error:', error)
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
        // Get all auth users
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()

        // Get profiles
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, created_at, is_active, deactivated_at')

        // Get group memberships with group names
        const { data: memberships } = await supabaseAdmin
            .from('group_members')
            .select('user_id, group:groups(id, name)')

        // Get all task assignments
        const { data: assignments } = await supabaseAdmin
            .from('task_assignments')
            .select('user_id, status')

        // Get all circular recipients
        const { data: circularRecipients } = await supabaseAdmin
            .from('circular_recipients')
            .select('user_id')

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
        const groupMap = new Map<string, { id: string; name: string }[]>()

        memberships?.forEach(m => {
            const existing = groupMap.get(m.user_id) || []
            const group = m.group as unknown as { id: string; name: string } | null
            if (group && group.id && group.name) {
                existing.push({ id: group.id, name: group.name })
            }
            groupMap.set(m.user_id, existing)
        })

        // Calculate stats per user
        const statsMap = new Map<string, { totalTasks: number; activeTasks: number; completedTasks: number }>()
        assignments?.forEach(a => {
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
        circularRecipients?.forEach(r => {
            circularCountMap.set(r.user_id, (circularCountMap.get(r.user_id) || 0) + 1)
        })

        return authUsers?.map(u => ({
            id: u.id,
            full_name: profileMap.get(u.id)?.full_name || null,
            email: u.email || '',
            role: profileMap.get(u.id)?.role || 'member',
            created_at: profileMap.get(u.id)?.created_at || u.created_at,
            groups: groupMap.get(u.id) || [],
            is_active: profileMap.get(u.id)?.is_active ?? true,
            deactivated_at: profileMap.get(u.id)?.deactivated_at || null,
            stats: {
                totalTasks: statsMap.get(u.id)?.totalTasks || 0,
                activeTasks: statsMap.get(u.id)?.activeTasks || 0,
                completedTasks: statsMap.get(u.id)?.completedTasks || 0,
                circularsCount: circularCountMap.get(u.id) || 0
            }
        })) || []

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
        // Get task with creator info
        const { data: task, error: taskError } = await supabaseAdmin
            .from('tasks')
            .select(`
                *,
                creator:profiles!tasks_created_by_fkey(full_name)
            `)
            .eq('id', taskId)
            .single()

        if (taskError || !task) return null

        // Get assignments
        const { data: assignments } = await supabaseAdmin
            .from('task_assignments')
            .select(`
                *,
                user:profiles(full_name)
            `)
            .eq('task_id', taskId)
            .order('assigned_at', { ascending: true })

        // Get user emails
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
        const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || [])

        return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status || 'open',
            created_at: task.created_at,
            is_archived: task.is_archived,
            created_by: task.created_by,
            creator_name: task.creator?.full_name,
            assignments: assignments?.map(a => ({
                id: a.id,
                user_id: a.user_id,
                user_name: a.user?.full_name,
                user_email: emailMap.get(a.user_id) || '',
                status: a.status,
                response_note: a.response_note,
                assigned_at: a.assigned_at,
                updated_at: a.updated_at
            })) || []
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
    console.log('[getAdminTasksWithAssignments] Called with userId:', userId)
    try {
        const { data: tasks, error: tasksError } = await supabaseAdmin
            .from('tasks')
            .select('id, title, description, created_at')
            .eq('created_by', userId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })

        console.log('[getAdminTasksWithAssignments] Tasks found:', tasks?.length, 'Error:', tasksError)

        if (!tasks || tasks.length === 0) return []

        // Get all assignments with user info
        const { data: assignments, error: assignmentsError } = await supabaseAdmin
            .from('task_assignments')
            .select('id, task_id, user_id, status, updated_at')
            .in('task_id', tasks.map(t => t.id))

        console.log('[getAdminTasksWithAssignments] Assignments found:', assignments?.length, 'Error:', assignmentsError)

        // Get employee profiles (without email - email is in auth.users)
        const userIds = [...new Set(assignments?.map(a => a.user_id) || [])]
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds)

        console.log('[getAdminTasksWithAssignments] Profiles found:', profiles?.length, 'Error:', profilesError)

        // Get emails from auth users
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
        const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || [])

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

        return tasks.map(t => ({
            ...t,
            assignments: (assignments?.filter(a => a.task_id === t.id) || []).map(a => ({
                id: a.id,
                user_id: a.user_id,
                employee_name: profileMap.get(a.user_id)?.full_name || 'غير معروف',
                employee_email: emailMap.get(a.user_id) || '',
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
                        url: `https://opsroom.vercel.app/dashboard/tasks/${taskId}`,
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

        revalidatePath(`/dashboard/tasks/${taskId}`)
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Update task status error:', error)
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

        if (error) {
            console.error('Get assigned tasks error:', error)
            return []
        }

        return (assignments || []).map(a => ({
            ...a,
            task: a.task as unknown as AssignedTask['task']
        }))
    } catch (error) {
        console.error('Get assigned tasks error:', error)
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

export async function getEmployeeProfileAction(employeeId: string): Promise<EmployeeProfileData | null> {
    try {
        // 1. Get employee profile
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
        const authUser = authUsers?.find(u => u.id === employeeId)

        if (!authUser) return null

        const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, created_at')
            .eq('id', employeeId)
            .single()

        // Get groups
        const { data: memberships } = await supabaseAdmin
            .from('group_members')
            .select('group:groups(id, name)')
            .eq('user_id', employeeId)

        const groups = memberships?.map(m => {
            const group = m.group as unknown as { id: string; name: string } | null
            return group ? { id: group.id, name: group.name } : null
        }).filter(Boolean) as { id: string; name: string }[] || []

        const profile: EmployeeProfile = {
            id: employeeId,
            full_name: profileData?.full_name || null,
            email: authUser.email || '',
            role: profileData?.role || 'member',
            created_at: profileData?.created_at || authUser.created_at,
            groups
        }

        // 2. Get all task assignments for this employee
        const { data: assignments } = await supabaseAdmin
            .from('task_assignments')
            .select(`
                id,
                task_id,
                user_id,
                status,
                response_note,
                assigned_at,
                updated_at,
                reminder_sent_at,
                task:tasks(id, title, description, created_at)
            `)
            .eq('user_id', employeeId)
            .order('assigned_at', { ascending: false })

        // Get all comments for these tasks
        const taskIds = assignments?.map(a => a.task_id) || []
        const { data: allComments } = await supabaseAdmin
            .from('task_comments')
            .select('id, task_id, user_id, content, created_at')
            .in('task_id', taskIds)
            .order('created_at', { ascending: true })

        // Get commenter profiles
        const commenterIds = [...new Set(allComments?.map(c => c.user_id) || [])]
        const { data: commenterProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .in('id', commenterIds)

        const commenterMap = new Map(commenterProfiles?.map(p => [p.id, { name: p.full_name, role: p.role }]) || [])

        // Group comments by task
        const commentsByTask = new Map<string, typeof allComments>()
        allComments?.forEach(c => {
            const existing = commentsByTask.get(c.task_id) || []
            existing.push(c)
            commentsByTask.set(c.task_id, existing)
        })

        // Process tasks
        const activeTasks: EmployeeTask[] = []
        const completedTasks: EmployeeTask[] = []

        assignments?.forEach(a => {
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

        // 3. Get circulars for this employee
        const { data: circularRecipients } = await supabaseAdmin
            .from('circular_recipients')
            .select(`
                id,
                circular_id,
                is_read,
                read_at,
                created_at,
                circular:circulars(id, title, content, created_by, created_at)
            `)
            .eq('user_id', employeeId)
            .order('created_at', { ascending: false })

        // Get sender names
        const senderIds = [...new Set(circularRecipients?.map(r => {
            const c = r.circular as unknown as { created_by: string } | null
            return c?.created_by
        }).filter(Boolean) || [])]

        const { data: senderProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .in('id', senderIds)

        const senderMap = new Map(senderProfiles?.map(p => [p.id, p.full_name]) || [])

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
        // Get employee email from auth
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const user = users?.find(u => u.id === employeeId)

        if (!user?.email) {
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
