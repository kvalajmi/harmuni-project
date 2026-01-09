'use client'

import { createBrowserClient } from '@supabase/ssr'

// Singleton instance to prevent multiple client creations
let browserClient: ReturnType<typeof createBrowserClient> | null = null

// Create a Supabase client for browser/client components
// This properly handles cookies and auth sessions in Next.js App Router
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

    // This creates a client that properly handles cookies and auth
    browserClient = createBrowserClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            auth: {
                // Disable lock to prevent "this.lock is not a function" error
                // caused by some browsers/extensions or PWA context
                lock: {
                    acquire: () => Promise.resolve(() => Promise.resolve()),
                    release: () => Promise.resolve()
                } as any,
                persistSession: true,
                autoRefreshToken: true,
            }
        }
    )

    return browserClient
}

// Alias for backward compatibility
export const getSupabaseBrowser = createSupabaseBrowser