'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
    getEmployeeTaskDetailsAction,
    updateEmployeeTaskStatusAction,
    addEmployeeTaskCommentAction,
    closeEmployeeTaskAction,
    EmployeeTask,
    EmployeeTaskAssignment,
    EmployeeTaskComment
} from '@/lib/employee-task-actions'
import { formatDistanceToNow, format } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function EmployeeTaskDetailsPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const params = useParams()
    const taskId = params.id as string

    const [task, setTask] = useState<EmployeeTask | null>(null)
    const [assignments, setAssignments] = useState<EmployeeTaskAssignment[]>([])
    const [comments, setComments] = useState<EmployeeTaskComment[]>([])
    const [loading, setLoading] = useState(true)
    const [newComment, setNewComment] = useState('')
    const [sendingComment, setSendingComment] = useState(false)

    const isAdmin = profile?.role === 'admin'
    const userAssignment = assignments.find(a => a.user_id === user?.id)
    const isCreator = task?.created_by === user?.id
    const canClose = !task?.is_closed && (isCreator || isAdmin)

    useEffect(() => {
        if (taskId) {
            loadTaskDetails()
        }
    }, [taskId])

    const loadTaskDetails = async () => {
        setLoading(true)
        try {
            const data = await getEmployeeTaskDetailsAction(taskId)
            setTask(data.task)
            setAssignments(data.assignments)
            setComments(data.comments)
        } catch (error) {
            console.error('Error loading task details:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (status: 'pending' | 'in_progress' | 'completed') => {
        if (!userAssignment || !user?.id) return

        const result = await updateEmployeeTaskStatusAction(
            userAssignment.id,
            status,
            user.id
        )

        if (result.success) {
            await loadTaskDetails()
        }
    }

    const handleAddComment = async () => {
        if (!newComment.trim() || !user?.id || sendingComment) return

        setSendingComment(true)
        try {
            const result = await addEmployeeTaskCommentAction(
                taskId,
                user.id,
                newComment.trim()
            )

            if (result.success) {
                setNewComment('')
                await loadTaskDetails()
            }
        } finally {
            setSendingComment(false)
        }
    }

    const handleCloseTask = async () => {
        if (!user?.id || !canClose) return

        if (confirm('هل أنت متأكد من إغلاق هذه المهمة؟')) {
            const result = await closeEmployeeTaskAction(taskId, user.id, isAdmin)
            if (result.success) {
                await loadTaskDetails()
            } else {
                alert(result.error || 'فشل في إغلاق المهمة')
            }
        }
    }

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        }
    }

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'pending': return 'قيد الانتظار'
            case 'in_progress': return 'قيد التنفيذ'
            case 'completed': return 'مكتملة'
            default: return status
        }
    }

    const getPriorityColor = (priority: string) => {
        switch(priority) {
            case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        }
    }

    const getPriorityLabel = (priority: string) => {
        switch(priority) {
            case 'urgent': return 'عاجل'
            case 'high': return 'مهم'
            case 'normal': return 'عادي'
            case 'low': return 'منخفض'
            default: return priority
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
                </div>
            </div>
        )
    }

    if (!task) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">المهمة غير موجودة</p>
                    <Link
                        href="/dashboard/employee-tasks"
                        className="text-blue-500 hover:underline"
                    >
                        العودة للمهام
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard/employee-tasks"
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                ← رجوع
                            </Link>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                تفاصيل المهمة
                            </h1>
                        </div>
                        {canClose && (
                            <button
                                onClick={handleCloseTask}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                إغلاق المهمة
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Task Info */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {task.title}
                        </h2>
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                            </span>
                            {task.is_closed && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                    مغلقة
                                </span>
                            )}
                        </div>
                    </div>

                    {task.description && (
                        <p className="text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap">
                            {task.description}
                        </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">المُنشئ:</span>
                            <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                {(task as any).creator?.full_name || 'غير معروف'}
                                {(task as any).creator?.role === 'admin' && (
                                    <span className="mr-2 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-2 py-1 rounded">
                                        مدير
                                    </span>
                                )}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">تاريخ الإنشاء:</span>
                            <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                {format(new Date(task.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                            </span>
                        </div>
                        {task.due_date && (
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">الموعد النهائي:</span>
                                <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                    {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ar })}
                                </span>
                            </div>
                        )}
                        {task.closed_at && (
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">تاريخ الإغلاق:</span>
                                <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                    {format(new Date(task.closed_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assignments */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        الموظفون المعينون
                    </h3>
                    <div className="space-y-3">
                        {assignments.map(assignment => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                                        {assignment.user?.full_name?.charAt(0) || '؟'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {assignment.user?.full_name || 'غير معروف'}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {formatDistanceToNow(new Date(assignment.updated_at), {
                                                addSuffix: true,
                                                locale: ar
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {assignment.user_id === user?.id && !task.is_closed ? (
                                        <select
                                            value={assignment.status}
                                            onChange={(e) => handleStatusUpdate(e.target.value as any)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium border-0 ${getStatusColor(assignment.status)}`}
                                        >
                                            <option value="pending">قيد الانتظار</option>
                                            <option value="in_progress">قيد التنفيذ</option>
                                            <option value="completed">مكتملة</option>
                                        </select>
                                    ) : (
                                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(assignment.status)}`}>
                                            {getStatusLabel(assignment.status)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comments */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        التعليقات ({comments.length})
                    </h3>

                    {/* Comments List */}
                    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                        {comments.length === 0 ? (
                            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                                لا توجد تعليقات بعد
                            </p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                                        {comment.user?.full_name?.charAt(0) || '؟'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-slate-900 dark:text-white">
                                                    {comment.user?.full_name || 'غير معروف'}
                                                </span>
                                                {comment.user?.role === 'admin' && (
                                                    <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-2 py-0.5 rounded">
                                                        مدير
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {formatDistanceToNow(new Date(comment.created_at), {
                                                        addSuffix: true,
                                                        locale: ar
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                {comment.comment}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Comment */}
                    {!task.is_closed && (
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                                    {profile?.full_name?.charAt(0) || '؟'}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="اكتب تعليقك..."
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim() || sendingComment}
                                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {sendingComment ? 'جاري الإرسال...' : 'إرسال'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}