
import { Suspense, useState, useEffect } from 'react'
import { getEmployeeProfileAction, getEmployeeTasksAction, markAssignmentCompletedAction } from '@/lib/staff-actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/shell'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEmployeeTasks, useEmployeeCirculars } from '@/lib/hooks'
import { toast } from 'sonner'
import { ErrorBoundary } from '@/components/error-boundary'
import { EmployeeProfileData, EmployeeTask } from '@/lib/staff-actions'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export default async function StaffProfilePage({ params }: Props) {
    const { id } = await params

    // Fetch initial data
    const profileData = await getEmployeeProfileAction(id)

    if (!profileData) {
        notFound()
    }

    // Get initial tasks for server-side rendering
    const tasksData = await getEmployeeTasksAction(id)

    // Merge into initialData format
    const initialData: EmployeeProfileData = {
        ...profileData,
        ...tasksData
    }

    return (
        <DashboardShell>
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Link href="/dashboard/staff" className="hover:text-blue-600 transition-colors">
                        الموظفين
                    </Link>
                    <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{initialData.profile.full_name}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 border border-purple-200">
                        v3.1-DEBUG
                    </span>
                </div>

                <ErrorBoundary>
                    <EmployeeProfileContent
                        initialData={initialData}
                        employeeId={id}
                    />
                </ErrorBoundary>
            </div>
        </DashboardShell>
    )
}

function EmployeeProfileContent({ initialData, employeeId }: { initialData: EmployeeProfileData, employeeId: string }) {
    console.log('DEBUG: EmployeeProfileContent Render', { initialData }) // DEBUG

    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'circulars'>('overview')

    // Use SWR for real-time updates
    const {
        data: tasksData,
        isLoading: tasksLoading
    } = useEmployeeTasks(employeeId, {
        fallbackData: {
            activeTasks: initialData.activeTasks || [],
            completedTasks: initialData.completedTasks || []
        }
    })

    const {
        data: circulars,
        isLoading: circularsLoading
    } = useEmployeeCirculars(employeeId, {
        fallbackData: initialData.circulars || []
    })

    // Safe data access with debug logs
    const activeTasks = Array.isArray(tasksData?.activeTasks) ? tasksData.activeTasks : []
    const completedTasks = Array.isArray(tasksData?.completedTasks) ? tasksData.completedTasks : []
    const safeCirculars = Array.isArray(circulars) ? circulars : []

    console.log('DEBUG: Tasks Data', { activeTasks, completedTasks, raw: tasksData }) // DEBUG

    // Calculate stats
    const stats = {
        activeCount: activeTasks.length,
        completedCount: completedTasks.length,
        circularCount: safeCirculars.length,
        unreadCircularCount: safeCirculars.filter((c: any) => !c.is_read).length
    }

    // Helper functions
    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '-'
        try {
            return format(new Date(dateStr), 'PPP p', { locale: ar })
        } catch (e) {
            console.error('Date formatting error:', e)
            return '-'
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-700 border-green-200">مكتملة</Badge>
            case 'pending':
                return <Badge className="bg-orange-100 text-orange-700 border-orange-200">معلقة</Badge>
            case 'in_progress':
                return <Badge className="bg-blue-100 text-blue-700 border-blue-200">جاري التنفيذ</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const handleMarkCompleted = async (assignmentId: string) => {
        try {
            await markAssignmentCompletedAction(assignmentId)
            toast.success('تم تحديث حالة المهمة بنجاح')
            // mutate will automatically update the UI via SWR
        } catch (error) {
            console.error('Error updating task:', error)
            toast.error('حدث خطأ أثناء تحديث حالة المهمة')
        }
    }

    // Combine tasks for Tasks tab
    const allTasks = [...activeTasks, ...completedTasks].sort((a, b) =>
        new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
    )

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">المهام النشطة</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeCount}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">المهام المكتملة</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completedCount}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">التعاميم</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.circularCount}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">تعاميم غير مقروءة</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.unreadCircularCount}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                    <TabsTrigger value="tasks">المهام ({stats.activeCount})</TabsTrigger>
                    <TabsTrigger value="circulars">التعاميم ({stats.unreadCircularCount})</TabsTrigger>
                </TabsList>

                {/* Overview Content */}
                <TabsContent value="overview" className="mt-6 space-y-6">
                    {/* Active Tasks Preview */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">المهام النشطة</h3>
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>
                                عرض الكل
                            </Button>
                        </div>

                        <div className="grid gap-4">
                            {activeTasks.length > 0 ? (
                                activeTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onMarkCompleted={handleMarkCompleted}
                                        formatDateTime={formatDateTime}
                                        getStatusBadge={getStatusBadge}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                    لا توجد مهام نشطة حالياً
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* Tasks Content */}
                <TabsContent value="tasks" className="mt-6">
                    <div className="space-y-4">
                        {allTasks.length > 0 ? (
                            allTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onMarkCompleted={handleMarkCompleted}
                                    formatDateTime={formatDateTime}
                                    getStatusBadge={getStatusBadge}
                                    showCompleted={true}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                لا توجد مهام مسجلة
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Circulars Content */}
                <TabsContent value="circulars" className="mt-6">
                    {/* Placeholder for Circulars implementation if simplified for this fix */}
                    <div className="text-center py-12 text-slate-500">
                        {safeCirculars && safeCirculars.length > 0 ? 'قائمة التعاميم' : 'لا توجد تعاميم'}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function TaskCard({ task, onMarkCompleted, formatDateTime, getStatusBadge, showCompleted = false }: any) {
    // DEBUG LOG
    console.log('DEBUG: TaskCard Render', { task })

    const [expanded, setExpanded] = useState(false)

    if (!task) return null

    // Safe comments check logic
    const comments = Array.isArray(task.comments) ? task.comments : []
    console.log('DEBUG: TaskCard comments', { comments, length: comments?.length }) // DEBUG

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
                    {!showCompleted && onMarkCompleted && task.status !== 'completed' && (
                        <Button
                            size="sm"
                            onClick={() => onMarkCompleted(task.id)} // id is assignment_id
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
            </div>

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
                            {comments.map((comment: any) => (
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

            <div className="mt-4 flex gap-2 flex-wrap">
                <Link href={`/dashboard/tasks/${task.task_id}`}>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        عرض التفاصيل والمحادثة
                    </Button>
                </Link>
            </div>
        </div>
    )
}
