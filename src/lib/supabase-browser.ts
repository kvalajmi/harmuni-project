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
        url: supabaseUrl?.substring(0, 30) + '...',
        isProduction: process.env.NODE_ENV === 'production'
    })

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    // This creates a client that properly handles cookies and auth
    const client = createBrowserClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                // Cookie options for production
                get(name: string) {
                    if (typeof document === 'undefined') return undefined

                    const cookies = document.cookie.split('; ')
                    const cookie = cookies.find(c => c.startsWith(`${name}=`))

                    console.log('[DEBUG] Cookie get:', {
                        name,
                        found: !!cookie,
                        value: cookie?.split('=')[1]?.substring(0, 20) + '...'
                    })

                    return cookie?.split('=')[1]
                },
                set(name: string, value: string, options?: any) {
                    if (typeof document === 'undefined') return

                    const isProduction = window.location.hostname !== 'localhost'

                    // Build cookie string with proper options
                    let cookieString = `${name}=${value}`

                    // Add cookie options
                    const cookieOptions = {
                        path: '/',
                        sameSite: 'lax',
                        secure: isProduction, // Only use secure in production (HTTPS)
                        ...options
                    }

                    if (cookieOptions.maxAge) {
                        cookieString += `; Max-Age=${cookieOptions.maxAge}`
                    }
                    if (cookieOptions.path) {
                        cookieString += `; Path=${cookieOptions.path}`
                    }
                    if (cookieOptions.domain) {
                        cookieString += `; Domain=${cookieOptions.domain}`
                    }
                    if (cookieOptions.sameSite) {
                        cookieString += `; SameSite=${cookieOptions.sameSite}`
                    }
                    if (cookieOptions.secure && isProduction) {
                        cookieString += '; Secure'
                    }

                    console.log('[DEBUG] Cookie set:', {
                        name,
                        hasValue: !!value,
                        options: cookieOptions,
                        isProduction
                    })

                    document.cookie = cookieString
                },
                remove(name: string, options?: any) {
                    if (typeof document === 'undefined') return

                    // Remove cookie by setting it with expired date
                    this.set(name, '', { ...options, maxAge: 0 })
                }
            }
        }
    )

    // Debug: Check if we can get session after creating client
    client.auth.getSession().then(({ data: { session }, error }) => {
        console.log('[DEBUG] Browser client session check:', {
            hasSession: !!session,
            userId: session?.user?.id?.substring(0, 8) + '...',
            error: error?.message
        })
    })

    return client
}

// Export a singleton instance for use in client components
let browserClient: ReturnType<typeof createSupabaseBrowser> | null = null

export function getSupabaseBrowser() {
    if (!browserClient && typeof window !== 'undefined') {
        browserClient = createSupabaseBrowser()
    }
    return browserClient
}