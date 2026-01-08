'use client'

import React, { useState, memo } from 'react'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { PushNotificationToggle } from '@/components/push-notification-toggle'

// Profile Tab Component
const ProfileTab = memo(function ProfileTab({
    user,
    profile,
    onSignOut
}: {
    user: User | null
    profile: Profile | null
    onSignOut: () => void
}) {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [showPasswordForm, setShowPasswordForm] = useState(false)

    const handlePasswordChange = async () => {
        setPasswordError(null)
        setPasswordSuccess(false)

        // Validation
        if (!newPassword || !confirmPassword) {
            setPasswordError('يرجى ملء جميع الحقول')
            return
        }

        if (newPassword.length < 6) {
            setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('كلمتا المرور غير متطابقتين')
            return
        }

        setPasswordLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })

            if (error) {
                setPasswordError(error.message)
            } else {
                setPasswordSuccess(true)
                setNewPassword('')
                setConfirmPassword('')
                // Auto-hide success after 3s
                setTimeout(() => setPasswordSuccess(false), 3000)
            }
        } catch {
            setPasswordError('حدث خطأ غير متوقع')
        }

        setPasswordLoading(false)
    }

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 text-center shadow-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.full_name || 'مستخدم'}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${profile?.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                    }`}>
                    {profile?.role === 'admin' ? 'مدير النظام' : 'عضو'}
                </span>
            </div>

            {/* Notification Settings */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">إعدادات الإشعارات</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">تحكم في الإشعارات الفورية</p>
                    </div>
                </div>
                <PushNotificationToggle userId={user?.id || ''} userEmail={user?.email} userName={profile?.full_name || undefined} />
            </div>

            {/* Security Settings - Password Change */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                {/* Header - Always visible as clickable button */}
                <button
                    onClick={() => {
                        setShowPasswordForm(!showPasswordForm)
                        if (!showPasswordForm) {
                            setPasswordError(null)
                            setPasswordSuccess(false)
                            setNewPassword('')
                            setConfirmPassword('')
                        }
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-right"
                >
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <span className="text-slate-900 dark:text-white flex-1">تغيير كلمة المرور</span>
                    <svg className={`w-5 h-5 text-slate-500 transition-transform ${showPasswordForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Expandable Form */}
                {showPasswordForm && (
                    <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700/50 pt-4">
                        {/* Success Message */}
                        {passwordSuccess && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                تم تغيير كلمة المرور بنجاح
                            </div>
                        )}

                        {/* Error Message */}
                        {passwordError && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm mb-4">
                                {passwordError}
                            </div>
                        )}

                        <div className="space-y-3">
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="كلمة المرور الجديدة"
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="تأكيد كلمة المرور الجديدة"
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={passwordLoading}
                                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {passwordLoading ? (
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            حفظ
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowPasswordForm(false)}
                                    className="px-4 py-3 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Settings */}
            {profile?.role === 'admin' && (
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                    <Link href="/dashboard/staff" className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-right">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <span className="text-slate-900 dark:text-white flex-1">إدارة الموظفين</span>
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                </div>
            )}

            {/* Sign Out */}
            <button
                onClick={onSignOut}
                className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                تسجيل الخروج
            </button>

            {/* App Info */}
            <p className="text-center text-slate-500 text-sm">
                Harmuni Task v1.0.0
            </p>
        </div>
    )
})

export default ProfileTab