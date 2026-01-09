'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { mutate } from 'swr'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { updateTaskStatusAction, sendTaskReminderAction, EmployeeTask, EmployeeCircular } from '@/lib/staff-actions'
import { useEmployeeProfileBasic, useEmployeeTasks, useEmployeeCirculars, mutationKeys } from '@/lib/hooks'
import { ErrorBoundary } from '@/components/error-boundary'

type TabType = 'active' | 'completed' | 'circulars'

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <ErrorBoundary>
            <EmployeeProfileContent params={params} />
        </ErrorBoundary>
    )
}

function EmployeeProfileContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, profile: currentUserProfile, loading: authLoading } = useAuth()
    const [activeTab, setActiveTab] = useState<TabType>('active')
    const router = useRouter()

    const isAdmin = currentUserProfile?.role === 'admin'

    // SWR Hooks - Optimized with lazy loading 🚀
    const { data: basicData, isLoading: basicLoading, mutate: mutateBasic } = useEmployeeProfileBasic(!authLoading && isAdmin ? id : null)
    const { data: tasksData, isLoading: tasksLoading, mutate: mutateTasks } = useEmployeeTasks(!authLoading && isAdmin && activeTab !== 'circulars' ? id : null)
    const { data: circularsData, isLoading: circularsLoading, mutate: mutateCirculars } = useEmployeeCirculars(!authLoading && isAdmin && activeTab === 'circulars' ? id : null)

    const loading = authLoading || basicLoading
    const employeeProfile = basicData?.profile
    const stats = basicData?.stats

    // RADICAL SANITIZATION 🛡️
    const activeTasks = Array.isArray(tasksData?.activeTasks) ? tasksData.activeTasks : []
    const completedTasks = Array.isArray(tasksData?.completedTasks) ? tasksData.completedTasks : []
    const circulars = Array.isArray(circularsData) ? circularsData : []

    // Auth and permission check
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login')
                return
            }
            if (!isAdmin) {
                router.push('/dashboard')
                return
            }
        }
    }, [authLoading, user, isAdmin, router])

    const loadData = useCallback(() => {
        mutateBasic()
        if (activeTab !== 'circulars') {
            mutateTasks()
        } else {
            mutateCirculars()
        }
    }, [mutateBasic, mutateTasks, mutateCirculars, activeTab])

    const handleMarkCompleted = async (taskId: string) => {
        const result = await updateTaskStatusAction(taskId, 'completed')
        if (result.success) {
            loadData()
        }
    }

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString)
        const day = date.getDate()
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        let hours = date.getHours()
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const ampm = hours >= 12 ? 'م' : 'ص'
        hours = hours % 12
        hours = hours ? hours : 12 // 0 becomes 12
        return `${day}/${month}/${year} - ${hours}:${minutes} ${ampm}`
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-amber-500/20 text-amber-400">قيد الانتظار</Badge>
            case 'in_progress':
                return <Badge className="bg-blue-500/20 text-blue-400">قيد التنفيذ</Badge>
            case 'completed':
                return <Badge className="bg-green-500/20 text-green-400">مكتمل</Badge>
            case 'rejected':
                return <Badge className="bg-red-500/20 text-red-400">مرفوض</Badge>
            default:
                return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>
        }
    }

    if (!isAdmin || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!employeeProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <p className="text-slate-500 dark:text-slate-400">لم يتم العثور على الموظف</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard?tab=employees" prefetch className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">ملف الموظف</h1>
                    </div>
                    <Link href={`/dashboard/staff/${id}/print`}>
                        <Button size="sm" variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            طباعة كشف
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="p-4 space-y-4 pb-8">
                {/* Employee Info Card */}
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600">
                            <AvatarFallback className="bg-transparent text-white text-xl font-bold">
                                {employeeProfile.full_name?.charAt(0) || employeeProfile.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{employeeProfile.full_name || 'بدون اسم'}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{employeeProfile.email}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant={employeeProfile.role === 'admin' ? 'default' : 'secondary'}
                                    className={employeeProfile.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-600/50 text-slate-700 dark:text-slate-300'}>
                                    {employeeProfile.role === 'admin' ? 'مدير' : 'موظف'}
                                </Badge>
                                {(employeeProfile.groups || []).map(g => (
                                    <Badge key={g.id} variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                        {g.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Responsive */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700/50 p-2 sm:p-4 text-center shadow-sm">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats?.activeTasks || 0}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">نشطة</p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700/50 p-2 sm:p-4 text-center shadow-sm">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats?.completedTasks || 0}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">مكتملة</p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700/50 p-2 sm:p-4 text-center shadow-sm">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats?.unreadCirculars || 0}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">تعاميم</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { id: 'active' as TabType, label: 'المهام النشطة', count: stats?.activeTasks || 0 },
                        { id: 'completed' as TabType, label: 'المهام المنجزة', count: stats?.completedTasks || 0 },
                        { id: 'circulars' as TabType, label: 'التعاميم', count: stats?.unreadCirculars || 0 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="space-y-3">
                    {activeTab === 'active' && (
                        tasksLoading ? (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center shadow-sm">
                                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : activeTasks.length === 0 ? (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400">لا توجد مهام نشطة</p>
                            </div>
                        ) : (
                            activeTasks.map(task => (
                                <TaskCard key={task.id} task={task} onMarkCompleted={handleMarkCompleted} formatDateTime={formatDateTime} getStatusBadge={getStatusBadge} />
                            ))
                        )
                    )}

                    {activeTab === 'completed' && (
                        tasksLoading ? (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center shadow-sm">
                                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : completedTasks.length === 0 ? (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400">لا توجد مهام مكتملة</p>
                            </div>
                        ) : (
                            completedTasks.map(task => (
                                <TaskCard key={task.id} task={task} formatDateTime={formatDateTime} getStatusBadge={getStatusBadge} showCompleted />
                            ))
                        )
                    )}

                    {activeTab === 'circulars' && (
                        circularsLoading ? (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center shadow-sm">
                                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : circulars.length === 0 ? (
                            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center shadow-sm">
                                <p className="text-slate-500 dark:text-slate-400">لا توجد تعاميم</p>
                            </div>
                        ) : (
                            circulars.map(circular => (
                                <CircularCard key={circular.id} circular={circular} formatDateTime={formatDateTime} />
                            ))
                        )
                    )}
                </div>
            </main>
        </div>
    )
}

// Task Card Component
function TaskCard({ task, onMarkCompleted, formatDateTime, getStatusBadge, showCompleted = false }: {
    task: EmployeeTask
    onMarkCompleted?: (taskId: string) => void
    formatDateTime: (date: string) => string
    getStatusBadge: (status: string) => React.ReactNode
    showCompleted?: boolean
}) {
    const [expanded, setExpanded] = useState(false)

    // Safe comments check
    const comments = Array.isArray(task.comments) ? task.comments : []

    return (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{task.task_title}</h3>
                    {task.task_description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{task.task_description}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(task.status)}
                    {/* Move Accept & Complete button here - under the status badge */}
                    {!showCompleted && onMarkCompleted && task.status !== 'completed' && (
                        <Button
                            size="sm"
                            onClick={() => onMarkCompleted(task.task_id)}
                            className="bg-green-500 hover:bg-green-600 text-white"
                        >
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            قبول وإكمال
                        </Button>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>أُرسلت: {formatDateTime(task.assigned_at)}</span>
                </div>
                {task.updated_at !== task.assigned_at && (
                    <div className="flex items-center gap-2 text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>آخر تحديث: {formatDateTime(task.updated_at)}</span>
                    </div>
                )}
                {task.completed_at && (
                    <div className="flex items-center gap-2 text-green-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>أُكملت: {formatDateTime(task.completed_at)}</span>
                    </div>
                )}
                {task.reminder_sent_at && (
                    <div className="flex items-center gap-2 text-orange-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span>تذكير: {formatDateTime(task.reminder_sent_at)}</span>
                    </div>
                )}
            </div>

            {/* Comments */}
            {comments.length > 0 && (
                <div className="mt-3">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
                    >
                        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {comments.length} تعليق
                    </button>

                    {expanded && (
                        <div className="mt-2 space-y-2 border-r-2 border-slate-200 dark:border-slate-700 pr-3 mr-2">
                            {comments.map(comment => (
                                <div key={comment.id} className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{comment.user_name}</span>
                                        <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-600">
                                            {comment.user_role === 'admin' ? 'مدير' : 'موظف'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{comment.content}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatDateTime(comment.created_at)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2 flex-wrap">
                {/* زر عرض المحادثة - يظهر دائماً */}
                <Link href={`/dashboard/tasks/${task.task_id}`}>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                    >
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        عرض المحادثة
                    </Button>
                </Link>

                {/* Reminder button only for active tasks */}
                {!showCompleted && onMarkCompleted && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                            const result = await sendTaskReminderAction(task.id, task.user_id, task.task_title)
                            if (result.success) {
                                window.location.reload()
                            }
                        }}
                        className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                    >
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        تذكير
                    </Button>
                )}
            </div>
        </div>
    )
}

// Circular Card Component
function CircularCard({ circular, formatDateTime }: {
    circular: EmployeeCircular
    formatDateTime: (date: string) => string
}) {
    return (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{circular.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{circular.content}</p>
                </div>
                {circular.is_read ? (
                    <Badge className="bg-green-500/20 text-green-400 shrink-0">
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        تمت القراءة
                    </Badge>
                ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 shrink-0">
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        لم يقرأ
                    </Badge>
                )}
            </div>

            <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>أُرسل: {formatDateTime(circular.created_at)}</span>
                </div>
                {circular.read_at && (
                    <div className="flex items-center gap-2 text-green-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>قرأها: {formatDateTime(circular.read_at)}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>بواسطة: {circular.sender_name}</span>
                </div>
            </div>
        </div>
    )
}
