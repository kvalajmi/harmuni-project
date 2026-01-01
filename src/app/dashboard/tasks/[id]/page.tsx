'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskDetailsSkeleton } from '@/components/skeletons'
import {
    getTaskDetailsAction,
    updateAssignmentStatusAction,
    TaskDetails,
    getTaskCommentsAction,
    addTaskCommentAction,
    updateTaskStatusAction,
    TaskComment
} from '@/lib/staff-actions'

export default function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [task, setTask] = useState<TaskDetails | null>(null)
    const [comments, setComments] = useState<TaskComment[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [userId, setUserId] = useState<string>('')
    const [newComment, setNewComment] = useState('')
    const [sending, setSending] = useState(false)
    const [taskStatus, setTaskStatus] = useState<'open' | 'completed'>('open')
    const chatEndRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        checkAndLoad()
    }, [id])

    useEffect(() => {
        // Scroll to bottom when comments change
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [comments])

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
        await loadTask()
    }

    const loadTask = async () => {
        setLoading(true)
        const [taskData, commentsData] = await Promise.all([
            getTaskDetailsAction(id),
            getTaskCommentsAction(id)
        ])
        setTask(taskData)
        setComments(commentsData)
        // Get task status from task data (fallback to 'open')
        if (taskData) {
            setTaskStatus(taskData.status || 'open')
        }
        setLoading(false)
    }

    const handleSendComment = async () => {
        if (!newComment.trim() || !userId) return
        setSending(true)
        await addTaskCommentAction(id, userId, newComment.trim())
        setNewComment('')
        // Reload comments
        const updatedComments = await getTaskCommentsAction(id)
        setComments(updatedComments)
        setSending(false)
    }

    const handleToggleStatus = async () => {
        const newStatus = taskStatus === 'open' ? 'completed' : 'open'
        await updateTaskStatusAction(id, newStatus)
        setTaskStatus(newStatus)
    }

    const handleStatusChange = async (assignmentId: string, newStatus: string) => {
        await updateAssignmentStatusAction(assignmentId, newStatus as 'pending' | 'in_progress' | 'completed' | 'rejected')
        loadTask()
    }

    const getTimeElapsed = (dateString: string) => {
        const created = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - created.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffDays > 0) return `${diffDays} يوم`
        if (diffHours > 0) return `${diffHours} ساعة`
        if (diffMins > 0) return `${diffMins} دقيقة`
        return 'الآن'
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    }

    const statusConfig = {
        pending: { label: 'جديد', color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
        in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' },
        completed: { label: 'مكتمل', color: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' },
        rejected: { label: 'مرفوض', color: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' }
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
                        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded" />
                    </div>
                </header>
                <main className="p-4 space-y-4">
                    <TaskDetailsSkeleton />
                </main>
            </div>
        )
    }

    if (!task) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">المهمة غير موجودة</h2>
                    <Button onClick={() => router.push('/dashboard')}>العودة للوحة التحكم</Button>
                </div>
            </div>
        )
    }

    const completedCount = task.assignments.filter(a => a.status === 'completed').length

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-3 px-4 py-4">
                    <button onClick={() => router.push('/dashboard')} className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white flex-1">تفاصيل المهمة</h1>

                    {/* Status Badge */}
                    {taskStatus === 'open' ? (
                        <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-sm font-medium">
                            <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse" />
                            جاري العمل
                        </span>
                    ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-600/50 text-slate-600 dark:text-slate-400 text-sm font-medium">
                            منتهية
                        </span>
                    )}
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {/* Task Info Card */}
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{task.title}</h2>
                        <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 shrink-0">
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            منذ {getTimeElapsed(task.created_at)}
                        </Badge>
                    </div>

                    {task.description && (
                        <p className="text-slate-600 dark:text-slate-300 mb-4">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>بواسطة: {task.creator_name || 'غير معروف'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>

                    {/* Admin Toggle Button */}
                    {isAdmin && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                            <Button
                                onClick={handleToggleStatus}
                                variant={taskStatus === 'open' ? 'default' : 'outline'}
                                className={taskStatus === 'open'
                                    ? 'bg-slate-600 hover:bg-slate-500'
                                    : 'border-green-500 text-green-400 hover:bg-green-500/10'}
                            >
                                {taskStatus === 'open' ? (
                                    <>
                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        إغلاق المهمة
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        إعادة فتح المهمة
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Progress Card */}
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">نسبة الإنجاز</h3>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{completedCount}/{task.assignments.length}</span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                            style={{ width: `${task.assignments.length > 0 ? (completedCount / task.assignments.length) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Assignments Table */}
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
                        <h3 className="font-semibold text-slate-900 dark:text-white">قائمة التوزيع ({task.assignments.length} موظف)</h3>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-700/50 hover:bg-transparent">
                                <TableHead className="text-slate-500 dark:text-slate-400 text-right">الموظف</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400 text-right">الحالة</TableHead>
                                {isAdmin && <TableHead className="text-slate-500 dark:text-slate-400 text-right w-32">تغيير</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {task.assignments.map((assignment) => (
                                <TableRow key={assignment.id} className="border-slate-200 dark:border-slate-700/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 bg-gradient-to-br from-blue-500 to-purple-600">
                                                <AvatarFallback className="bg-transparent text-white text-sm">
                                                    {assignment.user_name?.charAt(0) || assignment.user_email.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">{assignment.user_name || 'بدون اسم'}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{assignment.user_email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={statusConfig[assignment.status as keyof typeof statusConfig]?.color || statusConfig.pending.color}>
                                            {statusConfig[assignment.status as keyof typeof statusConfig]?.label || 'جديد'}
                                        </Badge>
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            <Select
                                                value={assignment.status}
                                                onValueChange={(v) => handleStatusChange(assignment.id, v)}
                                            >
                                                <SelectTrigger className="h-8 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    <SelectItem value="pending">جديد</SelectItem>
                                                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                                                    <SelectItem value="completed">مكتمل</SelectItem>
                                                    <SelectItem value="rejected">مرفوض</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Discussion Section */}
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        <h3 className="font-semibold text-slate-900 dark:text-white">المناقشة</h3>
                        <span className="text-slate-500 text-sm">({comments.length})</span>
                    </div>

                    {/* Chat Messages */}
                    <div className="max-h-80 overflow-y-auto p-4 space-y-4">
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className={`flex gap-3 ${comment.user_id === userId ? 'flex-row-reverse' : ''}`}
                                >
                                    <Avatar className={`h-8 w-8 shrink-0 ${comment.user_role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
                                        <AvatarFallback className="bg-transparent text-white text-xs">
                                            {comment.user_name?.charAt(0) || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={`flex-1 max-w-[80%] ${comment.user_id === userId ? 'text-left' : 'text-right'}`}>
                                        <div className={`inline-block p-3 rounded-2xl ${comment.user_role === 'admin'
                                            ? 'bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30'
                                            : 'bg-slate-100 dark:bg-slate-700/50'
                                            } ${comment.user_id === userId ? 'rounded-bl-none' : 'rounded-br-none'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-medium ${comment.user_role === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                                    {comment.user_name}
                                                    {comment.user_role === 'admin' && ' (مدير)'}
                                                </span>
                                                <span className="text-xs text-slate-500">{formatTime(comment.created_at)}</span>
                                            </div>
                                            <p className="text-slate-900 dark:text-white text-sm">{comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p>لا توجد رسائل بعد</p>
                                <p className="text-sm">كن أول من يرد على هذه المهمة</p>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            </main>

            {/* Fixed Input Area - Only show when task is open */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700/50 p-4">
                {taskStatus === 'completed' ? (
                    // Read-only mode when task is completed
                    <div className="flex items-center justify-center gap-3 py-2 text-slate-500 dark:text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-sm">تم إغلاق هذه المهمة - المناقشة للقراءة فقط</span>
                    </div>
                ) : (
                    // Active input when task is open
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                            placeholder="اكتب رداً..."
                            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSendComment}
                            disabled={sending || !newComment.trim()}
                            className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                        >
                            {sending ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    إرسال
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
