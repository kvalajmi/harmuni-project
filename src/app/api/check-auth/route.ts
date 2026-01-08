import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        // Create server-side Supabase client
        const supabase = createSupabaseServer()

        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        console.log('[API] Check Auth - Session:', {
            hasSession: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
            error: sessionError?.message
        })

        // If we have a session, try to fetch the profile
        let profileData = null
        let profileError = null

        if (session?.user?.id) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            profileData = data
            profileError = error

            console.log('[API] Check Auth - Profile fetch:', {
                hasProfile: !!data,
                error: error?.message
            })
        }

        // Check cookies
        const cookieStore = cookies()
        const supabaseAuthToken = cookieStore.get('sb-auth-token')
        const allCookies = cookieStore.getAll().map(c => ({
            name: c.name,
            valueLength: c.value?.length || 0,
            // Only show first few chars for security
            valuePreview: c.name.includes('sb-') ? c.value?.substring(0, 20) + '...' : 'hidden'
        }))

        return NextResponse.json({
            session: {
                exists: !!session,
                user: session?.user ? {
                    id: session.user.id,
                    email: session.user.email,
                    created_at: session.user.created_at
                } : null,
                accessToken: session?.access_token ? session.access_token.substring(0, 20) + '...' : null,
                error: sessionError?.message || null
            },
            profile: {
                exists: !!profileData,
                data: profileData || null,
                error: profileError ? {
                    message: profileError.message,
                    code: profileError.code,
                    details: profileError.details,
                    hint: profileError.hint
                } : null
            },
            cookies: {
                hasSupabaseAuthToken: !!supabaseAuthToken,
                allCookies: allCookies
            }
        })
    } catch (error) {
        console.error('[API] Check Auth - Exception:', error)
        return NextResponse.json({
            error: 'Exception occurred',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}