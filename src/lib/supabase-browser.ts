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
            // Custom lock implementation to prevent hanging on getSession()
            lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => {
                return await fn()
            }
        }
    })

    return browserClient
}

export const getSupabaseBrowser = createSupabaseBrowser
