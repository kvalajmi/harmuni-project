'use client'

import React, { useState, memo } from 'react'
import Link from 'next/link'
import { AdminTaskWithAssignments, AssignedTask, adminMarkAssignmentCompleteAction } from '@/lib/staff-actions'
import { AdminTasksListSkeleton, TasksListSkeleton } from '@/components/skeletons'

// Tasks Tab Component - Different views for Admin vs Staff
const TasksTab = memo(function TasksTab({
    tasks,
    adminTasks,
    isAdmin,
    isLoadingAdminTasks,
    onRefresh,
    mutateAdminTasks
}: {
    tasks: AssignedTask[]
    adminTasks: AdminTaskWithAssignments[]
    isAdmin: boolean
    isLoadingAdminTasks: boolean
    onRefresh: () => void
    mutateAdminTasks: () => void
}) {
    const [markingId, setMarkingId] = useState<string | null>(null)

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffDays > 0) return `منذ ${diffDays} يوم`
        if (diffHours > 0) return `منذ ${diffHours} ساعة`
        if (diffMins > 0) return `منذ ${diffMins} دقيقة`
        return 'الآن'
    }

    const handleMarkComplete = async (assignmentId: string) => {
        setMarkingId(assignmentId)
        await adminMarkAssignmentCompleteAction(assignmentId)
        mutateAdminTasks()
        setMarkingId(null)
    }

    // Sort tasks: tasks with incomplete assignments first, then fully completed at bottom
    const sortedTasks = [...adminTasks].sort((a, b) => {
        const aAllComplete = a.assignments.every(asgn => asgn.status === 'completed')
        const bAllComplete = b.assignments.every(asgn => asgn.status === 'completed')
        if (aAllComplete && !bAllComplete) return 1
        if (!aAllComplete && bAllComplete) return -1
        // Sort by date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const statusColors: Record<string, string> = {
        pending: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
        in_progress: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
        completed: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
        rejected: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
    }

    const statusLabels: Record<string, string> = {
        pending: 'قيد الانتظار',
        in_progress: 'قيد التنفيذ',
        completed: 'منجزة ✓',
        rejected: 'مرفوضة'
    }

    // ADMIN VIEW - Show tasks grouped (not individual assignments)
    if (isAdmin) {
        // Show skeleton while loading
        if (isLoadingAdminTasks) {
            return <AdminTasksListSkeleton />
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">المهام المرسلة</h2>
                    <button
                        onClick={onRefresh}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {sortedTasks.length > 0 ? (
                    <div className="space-y-3">
                        {sortedTasks.map((task) => {
                            const completedCount = task.assignments.filter(a => a.status === 'completed').length
                            const totalCount = task.assignments.length
                            const isFullyComplete = completedCount === totalCount
                            const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

                            return (
                                <Link
                                    key={task.id}
                                    href={`/dashboard/tasks/${task.id}`}
                                    prefetch
                                    className={`block bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 ${isFullyComplete ? 'opacity-60' : ''}`}
                                >
                                    {/* Task Header */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {task.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {getTimeAgo(task.created_at)}
                                                </p>
                                            </div>
                                            {/* Progress Badge */}
                                            <div className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium ${isFullyComplete
                                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                {completedCount}/{totalCount}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                                            <div
                                                className={`h-full transition-all duration-500 ${isFullyComplete ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>

                                        {/* Assignees */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {totalCount} موظف
                                                </span>
                                            </div>
                                            <span className="text-slate-300 dark:text-slate-600">|</span>
                                            <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                                                {task.assignments.slice(0, 4).map((assignment, idx) => (
                                                    <div
                                                        key={assignment.id}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 ${assignment.status === 'completed'
                                                            ? 'bg-green-500'
                                                            : 'bg-gradient-to-br from-blue-500 to-purple-600'
                                                            }`}
                                                        title={`${assignment.employee_name} - ${statusLabels[assignment.status]}`}
                                                    >
                                                        {assignment.employee_name?.charAt(0) || '?'}
                                                    </div>
                                                ))}
                                                {task.assignments.length > 4 && (
                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800">
                                                        +{task.assignments.length - 4}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assignees Status Row */}
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700/50">
                                        <div className="flex flex-wrap gap-1.5">
                                            {task.assignments.map((assignment) => (
                                                <span
                                                    key={assignment.id}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[assignment.status]}`}
                                                >
                                                    <span className="truncate max-w-[80px]">{assignment.employee_name}</span>
                                                    {assignment.status === 'completed' && <span>✓</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">لم ترسل أي مهام بعد</h3>
                        <p className="text-slate-500 dark:text-slate-400">اضغط على زر + لإنشاء مهمة جديدة</p>
                    </div>
                )}
            </div>
        )
    }

    // STAFF VIEW - Show assigned tasks
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">المهام المسندة</h2>
                <button
                    onClick={onRefresh}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {tasks.length > 0 ? (
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 shadow-sm overflow-hidden">
                    {tasks.map((assignment) => (
                        <TaskItem key={assignment.id} assignment={assignment} />
                    ))}
                </div>
            ) : (
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">لا توجد مهام</h3>
                    <p className="text-slate-500 dark:text-slate-400">ستظهر هنا المهام المسندة إليك</p>
                </div>
            )}
        </div>
    )
})

// Task Item Component
function TaskItem({ assignment }: { assignment: AssignedTask }) {
    const statusColors: Record<string, string> = {
        pending: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
        in_progress: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
        completed: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
        rejected: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
    }

    const statusLabels: Record<string, string> = {
        pending: 'قيد الانتظار',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتمل',
        rejected: 'مرفوض'
    }

    return (
        <Link href={`/dashboard/tasks/${assignment.task?.id}`} prefetch className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">{assignment.task?.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{assignment.task?.description || 'بدون وصف'}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[assignment.status] || statusColors.pending}`}>
                    {statusLabels[assignment.status] || statusLabels.pending}
                </span>
            </div>
        </Link>
    )
}

export default TasksTab