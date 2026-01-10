'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const supabase = createSupabaseBrowser()
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user) {
                    // User is already logged in, redirect to dashboard
                    window.location.href = '/dashboard'
                    return
                }
            } catch (err) {
                console.error('Auth check error:', err)
            }
            setCheckingAuth(false)
        }

        checkAuth()
    }, [])

    useEffect(() => {
        if (searchParams.get('suspended') === 'true') {
            setError('تم إيقاف حسابك من قبل مدير النظام')
        }
    }, [searchParams])

    // Show loading while checking auth
    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#475569] via-[#334155] to-[#1e293b]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c9a96e]"></div>
            </div>
        )
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !password) {
            setError('يرجى إدخال البريد وكلمة المرور')
            return
        }

        setLoading(true)
        setError(null)

        // Timeout after 15 seconds
        const timeoutId = setTimeout(() => {
            setError('انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى')
            setLoading(false)
        }, 15000)

        try {
            const supabase = createSupabaseBrowser()

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            clearTimeout(timeoutId)

            if (authError) {
                setError(authError.message === 'Invalid login credentials'
                    ? 'بيانات الدخول غير صحيحة'
                    : authError.message || 'حدث خطأ في تسجيل الدخول')
                setLoading(false)
                return
            }

            if (data?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_active')
                    .eq('id', data.user.id)
                    .single()

                if (profile && profile.is_active === false) {
                    await supabase.auth.signOut()
                    setError('تم إيقاف حسابك من قبل مدير النظام')
                    setLoading(false)
                    return
                }

                // Redirect to dashboard
                window.location.href = '/dashboard'
            } else {
                setError('لم يتم العثور على بيانات المستخدم')
                setLoading(false)
            }
        } catch (err: any) {
            clearTimeout(timeoutId)
            setError(err?.message || 'حدث خطأ غير متوقع')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#475569] via-[#334155] to-[#1e293b] p-4">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#c9a96e]/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#c9a96e]/10 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md bg-[#334155]/50 backdrop-blur-xl border-[#475569]/50 shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-6">
                    {/* Company Logo */}
                    <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-[#c9a96e]/30">
                        <Image
                            src="/logo.jpg"
                            alt="Harmuni Plus Logo"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                            priority
                        />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">
                            مرحباً بكم
                        </CardTitle>
                        <CardDescription className="text-[#c9a96e] mt-2 text-base">
                            في نظام المهام لشركة هارموني بلس
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                                البريد الإلكتروني
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                placeholder="example@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="h-14 text-lg bg-[#475569]/50 border-[#475569]/50 text-white placeholder:text-slate-500 focus:border-[#c9a96e] focus:ring-[#c9a96e]/20 rounded-xl transition-all"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                                كلمة المرور
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="h-14 text-lg bg-[#475569]/50 border-[#475569]/50 text-white placeholder:text-slate-500 focus:border-[#c9a96e] focus:ring-[#c9a96e]/20 rounded-xl transition-all"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#c9a96e] to-[#b8956a] hover:from-[#b8956a] hover:to-[#a78560] text-white rounded-xl shadow-lg shadow-[#c9a96e]/25 transition-all duration-300 hover:shadow-[#c9a96e]/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <span>جاري تسجيل الدخول...</span>
                                </div>
                            ) : (
                                'تسجيل الدخول'
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-[#c9a96e]/70 text-sm">
                            Harmuni Plus © {new Date().getFullYear()}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#475569] via-[#334155] to-[#1e293b]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c9a96e]"></div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
