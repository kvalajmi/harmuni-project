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
            .select('id, full_name, role, created_at')

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
            groups: groupMap.get(u.id) || []
        })) || []

    } catch (error) {
        console.error('Get employees error:', error)
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

export async function getCreatedTasksAction(userId: string): Promise<{ id: string; title: string; created_at: string; assignment_count: number }[]> {
    try {
        const { data: tasks } = await supabaseAdmin
            .from('tasks')
            .select('id, title, created_at')
            .eq('created_by', userId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })

        if (!tasks) return []

        // Get assignment counts
        const { data: counts } = await supabaseAdmin
            .from('task_assignments')
            .select('task_id')
            .in('task_id', tasks.map(t => t.id))

        const countMap = new Map<string, number>()
        counts?.forEach(c => {
            countMap.set(c.task_id, (countMap.get(c.task_id) || 0) + 1)
        })

        return tasks.map(t => ({
            ...t,
            assignment_count: countMap.get(t.id) || 0
        }))
    } catch (error) {
        console.error('Get created tasks error:', error)
        return []
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
