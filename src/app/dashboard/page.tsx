'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Profile, Task, TaskAssignment, Notification } from '@/lib/supabase'
import { CreateTaskDrawer } from '@/components/create-task-drawer'
import { CreateCircularDrawer } from '@/components/create-circular-drawer'
import { ThemeToggle } from '@/components/theme-toggle'
import { PushNotificationToggle } from '@/components/push-notification-toggle'
import { getAssignedTasksAction, getNotificationsAction, markNotificationReadAction, AssignedTask, getCreatedTasksAction, getEmployeesAction, Employee } from '@/lib/staff-actions'
import { getAdminCircularsAction, getStaffCircularsAction, Circular } from '@/lib/circular-actions'
import {
    HomeTabSkeleton,
    AdminTasksListSkeleton,
    TasksListSkeleton,
    CircularsListSkeleton,
    NotificationsListSkeleton
} from '@/components/skeletons'

// Tab types
type TabType = 'home' | 'tasks' | 'circulars' | 'notifications' | 'employees' | 'profile'

// Staff circular type with read status
interface StaffCircular extends Circular {
    is_read: boolean
    read_at: string | null
}

// Admin task type for created tasks
interface AdminTask {
    id: string
    title: string
    description: string | null
    created_at: string
    is_archived: boolean
    assignment_count: number
}

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('home')
    const [stats, setStats] = useState({ pending: 0, completed: 0, total: 0 })
    const [tasks, setTasks] = useState<AssignedTask[]>([])
    const [adminTasks, setAdminTasks] = useState<AdminTask[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [circulars, setCirculars] = useState<(Circular | StaffCircular)[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [showCreateTask, setShowCreateTask] = useState(false)
    const [showCreateCircular, setShowCreateCircular] = useState(false)
    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            // Get profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            setProfile(profileData)

            // ADMIN: Fetch tasks CREATED by this user (uses server action)
            if (profileData?.role === 'admin') {
                const createdTasks = await getCreatedTasksAction(user.id)
                if (createdTasks && createdTasks.length > 0) {
                    // Calculate totals from all tasks
                    const totalPending = createdTasks.reduce((sum, t) => sum + t.pending_count, 0)
                    const totalCompleted = createdTasks.reduce((sum, t) => sum + t.completed_count, 0)

                    setAdminTasks(createdTasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        description: null,
                        created_at: t.created_at,
                        is_archived: false,
                        assignment_count: t.assignment_count
                    })))
                    setStats({ pending: totalPending, completed: totalCompleted, total: totalPending + totalCompleted })
                } else {
                    setAdminTasks([])
                    setStats({ pending: 0, completed: 0, total: 0 })
                }
            }

            // STAFF: Get task assignments using server action (bypasses RLS)
            const assignmentsData = await getAssignedTasksAction(user.id)

            if (assignmentsData && assignmentsData.length > 0) {
                setTasks(assignmentsData)
                // Only set stats for non-admin (admin stats set above)
                if (profileData?.role !== 'admin') {
                    const pending = assignmentsData.filter(a => a.status === 'pending' || a.status === 'in_progress').length
                    const completed = assignmentsData.filter(a => a.status === 'completed').length
                    setStats({ pending, completed, total: assignmentsData.length })
                }
            } else {
                setTasks([])
                if (profileData?.role !== 'admin') {
                    setStats({ pending: 0, completed: 0, total: 0 })
                }
            }

            // Get notifications using server action (bypasses RLS)
            const notificationsData = await getNotificationsAction(user.id)
            setNotifications(notificationsData as Notification[])

            // Get circulars based on role
            if (profileData?.role === 'admin') {
                const adminCirculars = await getAdminCircularsAction(user.id)
                setCirculars(adminCirculars)

                // Load employees for admin (for follow-up tab)
                const employeesData = await getEmployeesAction()
                setEmployees(employeesData)
            } else {
                const staffCirculars = await getStaffCircularsAction(user.id)
                setCirculars(staffCirculars)
            }

        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const unreadNotifications = notifications.filter(n => !n.is_read).length
    const unreadCirculars = circulars.filter(c => 'is_read' in c && !c.is_read).length

    // Render loading skeleton based on active tab
    const renderLoadingSkeleton = () => {
        switch (activeTab) {
            case 'home':
                return <HomeTabSkeleton />
            case 'tasks':
                return profile?.role === 'admin' ? <AdminTasksListSkeleton count={4} /> : <TasksListSkeleton count={4} />
            case 'circulars':
                return <CircularsListSkeleton count={3} />
            case 'notifications':
                return <NotificationsListSkeleton count={5} />
            default:
                return <HomeTabSkeleton />
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 transition-colors">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Ops Room</h1>
                            {loading ? (
                                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded" />
                            ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.role === 'admin' ? 'مدير النظام' : 'عضو'}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {profile?.role === 'admin' && (
                            <>
                                {/* Create Task Button */}
                                <button
                                    onClick={() => setShowCreateTask(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                                    title="مهمة جديدة"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="hidden sm:inline">مهمة</span>
                                </button>
                                {/* Create Circular Button */}
                                <button
                                    onClick={() => setShowCreateCircular(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-xl shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                                    title="تعميم جديد"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                    </svg>
                                    <span className="hidden sm:inline">تعميم</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleSignOut}
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content - Tab Views */}
            <main className="p-4 pb-28">
                {loading ? (
                    renderLoadingSkeleton()
                ) : (
                    <>
                        {activeTab === 'home' && (
                            <HomeTab stats={stats} profile={profile} tasks={tasks} />
                        )}
                        {activeTab === 'tasks' && (
                            <TasksTab
                                tasks={tasks}
                                adminTasks={adminTasks}
                                isAdmin={profile?.role === 'admin'}
                                onRefresh={loadData}
                            />
                        )}
                        {activeTab === 'circulars' && (
                            <CircularsTab
                                circulars={circulars}
                                isAdmin={profile?.role === 'admin'}
                                onRefresh={loadData}
                            />
                        )}
                        {activeTab === 'notifications' && (
                            <NotificationsTab notifications={notifications} onRefresh={loadData} />
                        )}
                        {activeTab === 'employees' && profile?.role === 'admin' && (
                            <EmployeesTab employees={employees} />
                        )}
                        {activeTab === 'profile' && (
                            <ProfileTab user={user} profile={profile} onSignOut={handleSignOut} />
                        )}
                    </>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700/50 z-50 transition-colors">
                <div className="flex items-center justify-around py-2 px-2 safe-area-bottom">
                    <NavItem
                        icon={<HomeIcon />}
                        label="الرئيسية"
                        active={activeTab === 'home'}
                        onClick={() => setActiveTab('home')}
                    />
                    <NavItem
                        icon={<TasksIcon />}
                        label="المهام"
                        active={activeTab === 'tasks'}
                        onClick={() => setActiveTab('tasks')}
                        badge={stats.pending > 0 ? stats.pending : undefined}
                    />
                    <NavItem
                        icon={<CircularsIcon />}
                        label="التعاميم"
                        active={activeTab === 'circulars'}
                        onClick={() => setActiveTab('circulars')}
                        badge={unreadCirculars > 0 ? unreadCirculars : undefined}
                    />
                    <NavItem
                        icon={<NotificationsIcon />}
                        label="التنبيهات"
                        active={activeTab === 'notifications'}
                        onClick={() => setActiveTab('notifications')}
                        badge={unreadNotifications > 0 ? unreadNotifications : undefined}
                    />
                    {profile?.role === 'admin' && (
                        <NavItem
                            icon={<EmployeesIcon />}
                            label="متابعة"
                            active={activeTab === 'employees'}
                            onClick={() => setActiveTab('employees')}
                        />
                    )}
                    <NavItem
                        icon={<ProfileIcon />}
                        label="حسابي"
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                    />
                </div>
            </nav>

            {/* Create Task Drawer */}
            <CreateTaskDrawer
                open={showCreateTask}
                onClose={() => setShowCreateTask(false)}
                onCreated={loadData}
                userId={user?.id || ''}
            />

            {/* Create Circular Drawer */}
            <CreateCircularDrawer
                open={showCreateCircular}
                onClose={() => setShowCreateCircular(false)}
                onCreated={loadData}
                userId={user?.id || ''}
            />
        </div>
    )
}

// Navigation Item Component
function NavItem({ icon, label, active, onClick, badge }: {
    icon: React.ReactNode
    label: string
    active: boolean
    onClick: () => void
    badge?: number
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${active
                ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
        >
            <div className="relative">
                {icon}
                {badge !== undefined && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </div>
            <span className="text-xs font-medium">{label}</span>
        </button>
    )
}

// Home Tab Component
function HomeTab({ stats, profile, tasks }: {
    stats: { pending: number; completed: number; total: number }
    profile: Profile | null
    tasks: AssignedTask[]
}) {
    const recentTasks = tasks.slice(0, 3)

    return (
        <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl border border-blue-500/30 dark:border-blue-500/20 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    مرحباً {profile?.full_name || 'بك'} 👋
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    iconBg="bg-amber-500/20"
                    iconColor="text-amber-600 dark:text-amber-400"
                    value={stats.pending}
                    label="مهام قيد التنفيذ"
                />
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    iconBg="bg-green-500/20"
                    iconColor="text-green-600 dark:text-green-400"
                    value={stats.completed}
                    label="مهام مكتملة"
                />
            </div>

            {/* Recent Tasks */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <h3 className="font-semibold text-slate-900 dark:text-white">آخر المهام</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{stats.total} مهمة</span>
                </div>

                {recentTasks.length > 0 ? (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {recentTasks.map((assignment) => (
                            <TaskItem key={assignment.id} assignment={assignment} />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h4 className="text-slate-900 dark:text-white font-medium mb-1">لا توجد مهام</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">ستظهر هنا المهام الموكلة إليك</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// Stat Card Component
function StatCard({ icon, iconBg, iconColor, value, label }: {
    icon: React.ReactNode
    iconBg: string
    iconColor: string
    value: number
    label: string
}) {
    return (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
                <span className={iconColor}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{label}</p>
        </div>
    )
}

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
        <Link href={`/dashboard/tasks/${assignment.task?.id}`} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
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

// Tasks Tab Component - Different views for Admin vs Staff
function TasksTab({ tasks, adminTasks, isAdmin, onRefresh }: {
    tasks: AssignedTask[]
    adminTasks: { id: string; title: string; description: string | null; created_at: string; assignment_count: number }[]
    isAdmin: boolean
    onRefresh: () => void
}) {
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

    // ADMIN VIEW - Show tasks created by admin
    if (isAdmin) {
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

                {adminTasks.length > 0 ? (
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                        {adminTasks.map((task) => (
                            <Link
                                key={task.id}
                                href={`/dashboard/tasks/${task.id}`}
                                className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-200 dark:border-slate-700/50 last:border-0"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-slate-900 dark:text-white truncate">{task.title}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{task.description || 'بدون وصف'}</p>
                                    </div>
                                    <div className="text-left shrink-0">
                                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                            {task.assignment_count} موظف
                                        </span>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{getTimeAgo(task.created_at)}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
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

    // STAFF VIEW - Show tasks assigned to user
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">المهام الموكلة إليك</h2>
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
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 shadow-sm">
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
                    <p className="text-slate-500 dark:text-slate-400">ستظهر هنا المهام الموكلة إليك</p>
                </div>
            )}
        </div>
    )
}

// Circulars Tab Component
function CircularsTab({ circulars, isAdmin, onRefresh }: {
    circulars: (Circular | StaffCircular)[]
    isAdmin: boolean
    onRefresh: () => void
}) {
    const router = useRouter()

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

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isAdmin ? 'التعاميم المرسلة' : 'التعاميم'}
                </h2>
                <button
                    onClick={onRefresh}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {circulars.length > 0 ? (
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                    {circulars.map((circular) => {
                        const isStaffCircular = 'is_read' in circular
                        const isRead = isStaffCircular ? circular.is_read : true

                        return (
                            <Link
                                key={circular.id}
                                href={`/dashboard/circulars/${circular.id}`}
                                className={`block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-200 dark:border-slate-700/50 last:border-0 ${!isRead ? 'bg-amber-50 dark:bg-amber-500/5' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Unread indicator */}
                                    {!isRead && (
                                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 shrink-0 animate-pulse" />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-medium text-slate-900 dark:text-white truncate">{circular.title}</h4>
                                            {isAdmin && 'read_count' in circular && (
                                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 shrink-0">
                                                    {circular.read_count}/{circular.total_recipients}
                                                </span>
                                            )}
                                            {!isAdmin && !isRead && (
                                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                                                    جديد
                                                </span>
                                            )}
                                            {!isAdmin && isRead && (
                                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 shrink-0">
                                                    تم القراءة
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                                            {circular.content.substring(0, 100)}...
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                            {getTimeAgo(circular.created_at)}
                                            {circular.creator_name && ` • ${circular.creator_name}`}
                                        </p>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {isAdmin ? 'لم ترسل أي تعاميم بعد' : 'لا توجد تعاميم'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isAdmin ? 'اضغط على زر الإعلان لإنشاء تعميم جديد' : 'ستظهر هنا التعاميم الموجهة إليك'}
                    </p>
                </div>
            )}
        </div>
    )
}

// Notifications Tab Component
function NotificationsTab({ notifications, onRefresh }: {
    notifications: Notification[]
    onRefresh: () => void
}) {
    const router = useRouter()

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read using server action (bypasses RLS)
        if (!notification.is_read) {
            await markNotificationReadAction(notification.id)
            onRefresh()
        }

        // Navigate to task if related_task_id exists
        if (notification.related_task_id) {
            router.push(`/dashboard/tasks/${notification.related_task_id}`)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">التنبيهات</h2>
                <button
                    onClick={onRefresh}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {notifications.length > 0 ? (
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 shadow-sm">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 transition-colors cursor-pointer ${notification.is_read ? 'opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${notification.is_read ? 'bg-slate-400 dark:bg-slate-500' : 'bg-blue-500 animate-pulse'}`} />
                                <div className="flex-1">
                                    <p className="text-slate-900 dark:text-white">{notification.message}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {new Date(notification.created_at).toLocaleDateString('ar-SA')}
                                        </p>
                                        {notification.related_task_id && (
                                            <span className="text-xs text-blue-600 dark:text-blue-400">← اضغط للانتقال للمهمة</span>
                                        )}
                                    </div>
                                </div>
                                {notification.related_task_id && (
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">لا توجد تنبيهات</h3>
                    <p className="text-slate-500 dark:text-slate-400">ستظهر هنا التنبيهات الجديدة</p>
                </div>
            )}
        </div>
    )
}

// Employees Tab Component (Admin only)
function EmployeesTab({ employees }: { employees: Employee[] }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">متابعة مهام الموظفين</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">{employees.length} موظف</span>
            </div>

            {employees.length === 0 ? (
                <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400">لا يوجد موظفين</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {employees.filter(emp => emp.role !== 'admin').map(employee => (
                        <Link
                            key={employee.id}
                            href={`/dashboard/staff/${employee.id}`}
                            className="block bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                    {employee.full_name?.charAt(0) || employee.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {employee.full_name || 'بدون اسم'}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                        {employee.email}
                                    </p>
                                </div>
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </div>
                            {employee.groups.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {employee.groups.map(g => (
                                        <span key={g.id} className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            {g.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

// Profile Tab Component
function ProfileTab({ user, profile, onSignOut }: {
    user: User | null
    profile: Profile | null
    onSignOut: () => void
}) {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [passwordSuccess, setPasswordSuccess] = useState(false)

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
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">تغيير كلمة المرور</h3>
                </div>

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
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="تأكيد كلمة المرور الجديدة"
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={handlePasswordChange}
                        disabled={passwordLoading}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
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
                                تغيير كلمة المرور
                            </>
                        )}
                    </button>
                </div>
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
                Ops Room v1.0.0
            </p>
        </div>
    )
}


// Create Task Modal Component
function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!title.trim()) return
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('tasks')
                .insert({
                    title,
                    description,
                    created_by: user.id
                })

            if (!error) {
                onCreated()
                onClose()
            }
        } catch (error) {
            console.error('Error creating task:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-slate-800 rounded-t-3xl border-t border-slate-700/50 p-6 animate-in slide-in-from-bottom">
                <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-6" />

                <h2 className="text-xl font-bold text-white mb-6">مهمة جديدة</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">العنوان</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="عنوان المهمة"
                            className="w-full h-12 px-4 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">الوصف</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="وصف المهمة (اختياري)"
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                        />
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={loading || !title.trim()}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-blue-500/40"
                    >
                        {loading ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Icon Components
function HomeIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    )
}

function TasksIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
    )
}

function CircularsIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
    )
}

function NotificationsIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    )
}

function ProfileIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    )
}

function EmployeesIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    )
}
