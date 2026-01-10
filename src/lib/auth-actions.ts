'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInAction(email: string, password: string) {
    try {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options) {
                        console.log('[Auth Action] Setting cookie:', { name, hasValue: !!value })
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options) {
                        cookieStore.set({ name, value: '', ...options })
                    },
                },
            }
        )

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('[Auth Action] Login error:', error.message)
        return { success: false, error: error.message }
    }

        console.log('[Auth Action] Login successful:', {
            userId: data.user?.id,
            email: data.user?.email,
            hasSession: !!data.session
        })

        // Check if profile exists
        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_active')
                .eq('id', data.user.id)
                .single()

            if (profile && profile.is_active === false) {
                await supabase.auth.signOut()
                return { success: false, error: 'تم إيقاف حسابك من قبل مدير النظام' }
            }
        }

        return { success: true, user: data.user }
    } catch (error) {
        console.error('[Auth Action] Exception:', error)
        return { success: false, error: 'Server error occurred' }
    }
}

export async function signOutAction() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options) {
                    cookieStore.set({ name, value: '', ...options })
                },
            },
        }
    )

    await supabase.auth.signOut()
    redirect('/login')
}

export async function getSessionAction() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options) {
                    cookieStore.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { data: { session }, error } = await supabase.auth.getSession()

    return { session, error }
}