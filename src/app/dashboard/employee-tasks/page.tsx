'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
    getAllEmployeeTasksAction,
    getUserEmployeeTasksAction,
    closeEmployeeTaskAction,
    EmployeeTask
} from '@/lib/employee-task-actions'
import { CreateEmployeeTaskDrawer } from '@/components/create-employee-task-drawer'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function EmployeeTasksPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [tasks, setTasks] = useState<EmployeeTask[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateTask, setShowCreateTask] = useState(false)
    const [filter, setFilter] = useState<'all' | 'created' | 'assigned'>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('open')

    const isAdmin = profile?.role === 'admin'

    useEffect(() => {
        loadTasks()
    }, [user?.id, isAdmin])

    const loadTasks = async () => {
        if (!user?.id) return

        setLoading(true)
        try {
            const data = isAdmin
                ? await getAllEmployeeTasksAction()
                : await getUserEmployeeTasksAction(user.id)
            setTasks(data)
        } catch (error) {
            console.error('Error loading tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCloseTask = async (taskId: string) => {
        if (!user?.id) return

        const result = await closeEmployeeTaskAction(taskId, user.id, isAdmin)
        if (result.success) {
            await loadTasks()
        } else {
            alert(result.error || 'فشل في إغلاق المهمة')
        }
    }

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        // Status filter
        if (statusFilter === 'open' && task.is_closed) return false
        if (statusFilter === 'closed' && !task.is_closed) return false

        // Role filter (for non-admin)
        if (!isAdmin && filter !== 'all') {
            if (filter === 'created' && task.created_by !== user?.id) return false
            if (filter === 'assigned' && task.created_by === user?.id) return false
        }

        return true
    })

    const getPriorityColor = (priority: string) => {
        switch(priority) {
            case 'urgent': return 'text-red-500'
            case 'high': return 'text-orange-500'
            case 'normal': return 'text-blue-500'
            case 'low': return 'text-gray-500'
            default: return 'text-gray-500'
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

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'pending': return '⏳'
            case 'in_progress': return '🔄'
            case 'completed': return '✅'
            default: return '❓'
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                ← رجوع
                            </Link>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                مهام بين الموظفين
                            </h1>
                        </div>
                        <button
                            onClick={() => setShowCreateTask(true)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            + مهمة جديدة
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        {/* Status Filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                الكل ({tasks.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('open')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    statusFilter === 'open'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                مفتوحة ({tasks.filter(t => !t.is_closed).length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('closed')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    statusFilter === 'closed'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                مغلقة ({tasks.filter(t => t.is_closed).length})
                            </button>
                        </div>

                        {/* Role Filter (for non-admin) */}
                        {!isAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        filter === 'all'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    جميع المهام
                                </button>
                                <button
                                    onClick={() => setFilter('created')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        filter === 'created'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    مهامي المُرسلة
                                </button>
                                <button
                                    onClick={() => setFilter('assigned')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        filter === 'assigned'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    مهام واردة لي
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-4">
                    {filteredTasks.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                            <p className="text-slate-500 dark:text-slate-400 text-lg">
                                لا توجد مهام
                            </p>
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <div
                                key={task.id}
                                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border-l-4 ${
                                    task.is_closed
                                        ? 'border-gray-400 opacity-75'
                                        : task.priority === 'urgent'
                                        ? 'border-red-500'
                                        : task.priority === 'high'
                                        ? 'border-orange-500'
                                        : 'border-blue-500'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {/* Title and Priority */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                {task.title}
                                            </h3>
                                            <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                                {getPriorityLabel(task.priority)}
                                            </span>
                                            {task.is_closed && (
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                                                    مغلقة
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {task.description && (
                                            <p className="text-slate-600 dark:text-slate-400 mb-3">
                                                {task.description}
                                            </p>
                                        )}

                                        {/* Metadata */}
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <span>من:</span>
                                                <span className="font-medium">
                                                    {task.creator?.full_name || 'غير معروف'}
                                                </span>
                                                {task.creator?.role === 'admin' && (
                                                    <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-1 rounded">
                                                        مدير
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <span>إلى:</span>
                                                <span className="font-medium">
                                                    {task.assignments?.map(a => a.user_name).join(', ') || 'لا يوجد'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <span>الحالة:</span>
                                                <div className="flex gap-1">
                                                    {task.assignments?.map(a => (
                                                        <span key={a.user_id} title={a.user_name || ''}>
                                                            {getStatusIcon(a.status)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {task.comment_count !== undefined && task.comment_count > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span>💬</span>
                                                    <span>{task.comment_count}</span>
                                                </div>
                                            )}

                                            <div>
                                                {formatDistanceToNow(new Date(task.created_at), {
                                                    addSuffix: true,
                                                    locale: ar
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 ml-4">
                                        <Link
                                            href={`/dashboard/employee-tasks/${task.id}`}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                        >
                                            عرض
                                        </Link>
                                        {!task.is_closed && (task.created_by === user?.id || isAdmin) && (
                                            <button
                                                onClick={() => handleCloseTask(task.id)}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                                            >
                                                إغلاق
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Task Drawer */}
            {showCreateTask && (
                <CreateEmployeeTaskDrawer
                    isOpen={showCreateTask}
                    onClose={() => {
                        setShowCreateTask(false)
                        loadTasks()
                    }}
                />
            )}
        </div>
    )
}