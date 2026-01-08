'use client'

import { createBrowserClient } from '@supabase/ssr'

// Create a Supabase client for browser/client components
// This properly handles cookies and auth sessions in Next.js App Router
export function createSupabaseBrowser() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('[DEBUG] Creating browser Supabase client:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        url: supabaseUrl?.substring(0, 30) + '...'
    })

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    // This creates a client that properly handles cookies and auth
    return createBrowserClient(
        supabaseUrl,
        supabaseAnonKey
    )
}

// Export a singleton instance for use in client components
let browserClient: ReturnType<typeof createSupabaseBrowser> | null = null

export function getSupabaseBrowser() {
    if (!browserClient && typeof window !== 'undefined') {
        browserClient = createSupabaseBrowser()
    }
    return browserClient
}