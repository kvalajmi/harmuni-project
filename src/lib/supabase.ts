import { createSupabaseBrowser } from './supabase-browser'

// Reuse the strict singleton browser client
export const supabase = createSupabaseBrowser()

// Type definitions for database tables
export type Profile = {
    id: string
    full_name: string | null
    avatar_url: string | null
    role: 'admin' | 'member'
    created_at: string
    updated_at: string
}

export type Group = {
    id: string
    name: string
    created_at: string
}

export type GroupMember = {
    id: string
    group_id: string
    user_id: string
    joined_at: string
}

export type Task = {
    id: string
    title: string
    description: string | null
    created_by: string
    is_archived: boolean
    created_at: string
    updated_at: string
}

export type TaskAssignment = {
    id: string
    task_id: string
    user_id: string
    status: 'pending' | 'in_progress' | 'completed' | 'rejected'
    response_note: string | null
    assigned_at: string
    updated_at: string
}

export type Notification = {
    id: string
    user_id: string
    message: string
    related_task_id: string | null
    is_read: boolean
    created_at: string
}
