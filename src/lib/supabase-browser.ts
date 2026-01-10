'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createSupabaseBrowser() {
    if (browserClient) {
        return browserClient
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    // Create a new client if one doesn't exist
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Use a no-op lock to prevent multiple tabs/windows contentions if needed,
            // but usually the default lock is fine. The warning "Multiple GoTrueClient"
            // suggests we are creating createClient() multiple times.
            // This singleton pattern + 'use client' + module scope variable should prevent it.
        }
    })

    return browserClient
}

export const getSupabaseBrowser = createSupabaseBrowser
