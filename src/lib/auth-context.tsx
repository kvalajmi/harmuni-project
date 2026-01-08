'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = {
    id: string
    full_name: string
    email: string
    department: string
    role: string
    is_admin: boolean
    avatar_url?: string
    phone?: string
    created_at: string
    is_active: boolean
}

interface AuthContextType {
    user: User | null
    session: Session | null
    profile: Profile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchProfile = async (userId: string) => {
        console.log('[DEBUG] AuthContext - Fetching profile for user:', userId?.substring(0, 8) + '...')

        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        console.log('[DEBUG] AuthContext - Profile fetch result:', {
            userId: userId?.substring(0, 8) + '...',
            hasData: !!profileData,
            error: error?.message || null,
            profile: profileData ? {
                id: profileData.id?.substring(0, 8) + '...',
                name: profileData.full_name,
                role: profileData.role,
                isActive: profileData.is_active
            } : null
        })

        if (!error && profileData) {
            setProfile(profileData)
        } else {
            console.error('[ERROR] AuthContext - Error fetching profile:', error)
            setProfile(null)
        }
    }

    const refreshProfile = async () => {
        if (user?.id) {
            await fetchProfile(user.id)
        }
    }

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            console.log('[DEBUG] AuthContext - Getting initial session...')

            const { data: { session }, error } = await supabase.auth.getSession()

            console.log('[DEBUG] AuthContext - Session result:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                userId: session?.user?.id?.substring(0, 8) + '...',
                email: session?.user?.email,
                error: error?.message || null
            })

            setSession(session)
            setUser(session?.user ?? null)

            // Fetch profile if user exists
            if (session?.user?.id) {
                await fetchProfile(session.user.id)
            }

            setLoading(false)
        }

        getInitialSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user?.id) {
                    await fetchProfile(session.user.id)
                } else {
                    setProfile(null)
                }

                setLoading(false)

                if (event === 'SIGNED_OUT') {
                    setProfile(null)
                    router.push('/login')
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        // Check if account is suspended
        if (!error && data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_active')
                .eq('id', data.user.id)
                .single()

            if (profile && profile.is_active === false) {
                // Sign out the user immediately
                await supabase.auth.signOut()
                return {
                    error: {
                        message: 'تم إيقاف حسابك من قبل مدير النظام',
                        name: 'AccountSuspendedError',
                        status: 403
                    } as AuthError
                }
            }
        }

        return { error }
    }

    const signUp = async (email: string, password: string, fullName?: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        })
        return { error }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
