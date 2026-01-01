'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CircularDetailsSkeleton } from '@/components/skeletons'
import {
    getCircularDetailsAction,
    markCircularAsReadAction,
    sendCircularReminderAction,
    CircularDetails
} from '@/lib/circular-actions'

export default function CircularDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [circular, setCircular] = useState<CircularDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [userId, setUserId] = useState<string>('')
    const [hasRead, setHasRead] = useState(false)
    const [markingRead, setMarkingRead] = useState(false)
    const [sendingReminder, setSendingReminder] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        checkAndLoad()
    }, [id])

    const checkAndLoad = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }
        setUserId(user.id)

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        setIsAdmin(profile?.role === 'admin')
        await loadCircular(user.id)
    }

    const loadCircular = async (currentUserId: string) => {
        setLoading(true)
        const data = await getCircularDetailsAction(id)
        setCircular(data)

        // Check if current user has read this circular
        if (data) {
            const userRecipient = data.recipients.find(r => r.user_id === currentUserId)
            setHasRead(userRecipient?.is_read || false)
        }

        setLoading(false)
    }

    const handleMarkAsRead = async () => {
        setMarkingRead(true)
        const result = await markCircularAsReadAction(id, userId)
        if (result.success) {
            setHasRead(true)
            await loadCircular(userId)
        }
        setMarkingRead(false)
    }

    const handleSendReminder = async (recipientUserId: string) => {
        setSendingReminder(recipientUserId)
        const result = await sendCircularReminderAction(id, recipientUserId)
        if (result.success) {
            await loadCircular(userId)
        }
        setSendingReminder(null)
    }

    const getTimeElapsed = (dateString: string) => {
        const created = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - created.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffDays > 0) return `منذ ${diffDays} يوم`
        if (diffHours > 0) return `منذ ${diffHours} ساعة`
        if (diffMins > 0) return `منذ ${diffMins} دقيقة`
        return 'الآن'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                {/* Header Skeleton */}
                <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 px-4 py-4">
                        <div className="p-2 -mr-2">
                            <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded" />
                        </div>
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded-lg" />
                        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded" />
                    </div>
                </header>
                <main className="p-4 space-y-4">
                    <CircularDetailsSkeleton />
                </main>
            </div>
        )
    }

    if (!circular) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">التعميم غير موجود</h2>
                    <Button onClick={() => router.push('/dashboard')}>العودة للوحة التحكم</Button>
                </div>
            </div>
        )
    }

    const readRecipients = circular.recipients.filter(r => r.is_read)
    const unreadRecipients = circular.recipients.filter(r => !r.is_read)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-3 px-4 py-4">
                    <button onClick={() => router.push('/dashboard')} className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                    </div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white flex-1">تفاصيل التعميم</h1>
                </div>
            </header>

            {/* Content */}
            <main className="p-4 space-y-4 pb-8">
                {/* Circular Info Card */}
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{circular.title}</h2>
                        <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {getTimeElapsed(circular.created_at)}
                        </Badge>
                    </div>

                    {/* Content */}
                    <div className="bg-slate-100 dark:bg-slate-700/30 rounded-xl p-4 mb-4">
                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{circular.content}</p>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>بواسطة: {circular.creator_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(circular.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                </div>

                {/* Staff: Mark as Read Button */}
                {!isAdmin && !hasRead && (
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl border border-green-500/30 p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">تأكيد الاستلام</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">اضغط للتأكيد بأنك قرأت واستلمت هذا التعميم</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleMarkAsRead}
                            disabled={markingRead}
                            className="w-full mt-4 h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                        >
                            {markingRead ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    تم الاستلام والقراءة
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Staff: Already Read Confirmation */}
                {!isAdmin && hasRead && (
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-green-500/30 p-5 text-center shadow-sm">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-green-600 dark:text-green-400 mb-1">تم تأكيد الاستلام</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">قمت بتأكيد استلام وقراءة هذا التعميم</p>
                    </div>
                )}

                {/* Admin: Read Statistics */}
                {isAdmin && (
                    <>
                        {/* Progress Card */}
                        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-900 dark:text-white">نسبة القراءة</h3>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {circular.read_count}/{circular.total_recipients}
                                </span>
                            </div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-green-500 transition-all duration-500"
                                    style={{
                                        width: `${circular.total_recipients && circular.total_recipients > 0
                                            ? ((circular.read_count || 0) / circular.total_recipients) * 100
                                            : 0}%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Unread Recipients */}
                        {unreadRecipients.length > 0 && (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-red-200 dark:border-red-500/30 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">لم يقرأ بعد ({unreadRecipients.length})</h3>
                                </div>
                                <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                    {unreadRecipients.map((recipient) => (
                                        <div key={recipient.id} className="p-4 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 bg-gradient-to-br from-red-500 to-pink-600">
                                                    <AvatarFallback className="bg-transparent text-white">
                                                        {recipient.user_name?.charAt(0) || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{recipient.user_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{recipient.user_email}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSendReminder(recipient.user_id)}
                                                disabled={sendingReminder === recipient.user_id}
                                                className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                            >
                                                {sendingReminder === recipient.user_id ? (
                                                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                        </svg>
                                                        تذكير
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Read Recipients */}
                        {readRecipients.length > 0 && (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-green-200 dark:border-green-500/30 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">تم القراءة ({readRecipients.length})</h3>
                                </div>
                                <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                    {readRecipients.map((recipient) => (
                                        <div key={recipient.id} className="p-4 flex items-center gap-3">
                                            <Avatar className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600">
                                                <AvatarFallback className="bg-transparent text-white">
                                                    {recipient.user_name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900 dark:text-white">{recipient.user_name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{recipient.user_email}</p>
                                            </div>
                                            <div className="text-left">
                                                <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">تم القراءة</Badge>
                                                {recipient.read_at && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {new Date(recipient.read_at).toLocaleDateString('ar-SA')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
