'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance to prevent multiple client creations
let browserClient: SupabaseClient | null = null

// Create a Supabase client for browser/client components
export function createSupabaseBrowser() {
    // Return existing client if already created
    if (browserClient) {
        return browserClient
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    // Only log on first creation
    if (typeof window !== 'undefined') {
        console.log('[DEBUG] Creating browser Supabase client:', {
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            url: supabaseUrl?.substring(0, 30) + '...',
            isProduction: process.env.NODE_ENV === 'production'
        })
    }

    // Use createClient directly with lock disabled to fix "this.lock is not a function" error
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Disable Web Locks API to prevent errors in PWA/some browsers
            lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                return await fn()
            },
        }
    })

    return browserClient
}

// Alias for backward compatibility
export const getSupabaseBrowser = createSupabaseBrowser