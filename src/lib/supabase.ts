import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseInstance: SupabaseClient | null = null

export const supabase = (() => {
    if (supabaseInstance) return supabaseInstance

    // Debug logging for production issue
    console.log('[DEBUG] Supabase Client Init:', {
        hasUrl: !!supabaseUrl,
        urlStart: supabaseUrl?.substring(0, 30) + '...',
        hasAnonKey: !!supabaseAnonKey,
        keyStart: supabaseAnonKey?.substring(0, 20) + '...',
        isServer: typeof window === 'undefined'
    })

    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a dummy client for build time - will be replaced at runtime
        if (typeof window === 'undefined') {
            console.warn('[WARNING] Returning null client for server-side build')
            return null as unknown as SupabaseClient
        }
        console.error('[ERROR] Missing Supabase environment variables in browser context')
        throw new Error('Missing Supabase environment variables')
    }

    console.log('[DEBUG] Creating Supabase client instance...')
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    return supabaseInstance
})()

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
