'use client'

import { useEffect, useState, useCallback, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { Profile, Task, TaskAssignment, Notification } from '@/lib/supabase'
import { CreateTaskDrawer } from '@/components/create-task-drawer'
import { CreateCircularDrawer } from '@/components/create-circular-drawer'
import { ThemeToggle } from '@/components/theme-toggle'
import { PushNotificationToggle } from '@/components/push-notification-toggle'
import { markNotificationReadAction, AssignedTask, EmployeeWithStats, AdminTaskWithAssignments, adminMarkAssignmentCompleteAction } from '@/lib/staff-actions'
import {
    useEmployeesWithStats,
    useAssignedTasks,
    useCreatedTasks,
    useAdminTasksWithAssignments,
    useNotifications,
    useAdminCirculars,
    useStaffCirculars,
    mutationKeys
} from '@/lib/hooks'
import { Circular } from '@/lib/circular-actions'
import {
    HomeTabSkeleton,
    AdminTasksListSkeleton,
    TasksListSkeleton,
    CircularsListSkeleton,
    NotificationsListSkeleton
} from '@/components/skeletons'

// Dynamic imports for tab components with loading states
const HomeTab = dynamic(() => import('@/components/dashboard/HomeTab'), {
    loading: () => <HomeTabSkeleton />,
    ssr: false
})

const TasksTab = dynamic(() => import('@/components/dashboard/TasksTab'), {
    loading: () => <TasksListSkeleton />,
    ssr: false
})

const CircularsTab = dynamic(() => import('@/components/dashboard/CircularsTab'), {
    loading: () => <CircularsListSkeleton />,
    ssr: false
})

const NotificationsTab = dynamic(() => import('@/components/dashboard/NotificationsTab'), {
    loading: () => <NotificationsListSkeleton />,
    ssr: false
})

const ProfileTab = dynamic(() => import('@/components/dashboard/ProfileTab'), {
    loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-2xl" />,
    ssr: false
})

const EmployeeTasksTab = dynamic(() => import('@/components/dashboard/EmployeeTasksTab'), {
    loading: () => <TasksListSkeleton />,
    ssr: false
})

// Tab types
type TabType = 'home' | 'tasks' | 'circulars' | 'notifications' | 'profile' | 'employee-tasks'

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
    const { user, profile, loading: authLoading } = useAuth()
    const [activeTab, setActiveTab] = useState<TabType>('home')
    const [showCreateTask, setShowCreateTask] = useState(false)
    const [showCreateCircular, setShowCreateCircular] = useState(false)
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
    const router = useRouter()

    // Read tab from URL on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const tabFromUrl = params.get('tab') as TabType | null
            if (tabFromUrl && ['home', 'tasks', 'circulars', 'notifications', 'profile', 'employee-tasks'].includes(tabFromUrl)) {
                setActiveTab(tabFromUrl)
            }
        }
    }, [])

    // Update URL when tab changes (without full navigation)
    const handleTabChange = (newTab: TabType) => {
        setActiveTab(newTab)
        // Update URL without full page reload
        window.history.replaceState(null, '', `/dashboard?tab=${newTab}`)
    }

    const isAdmin = profile?.role === 'admin'
    const userId = user?.id || null

    // SWR Hooks - تحميل البيانات مع التخزين المؤقت 🚀
    const { data: employeesData, error: employeesError } = useEmployeesWithStats()
    const { data: assignedTasksData, error: assignedTasksError } = useAssignedTasks(userId)
    const { data: createdTasksData, error: createdTasksError } = useCreatedTasks(isAdmin ? userId : null)
    const { data: adminTasksWithAssignmentsData, isLoading: isLoadingAdminTasks, mutate: mutateAdminTasks, error: adminTasksError } = useAdminTasksWithAssignments(isAdmin ? userId : null)
    const { data: notificationsData, mutate: mutateNotifications, error: notificationsError } = useNotifications(userId)
    const { data: adminCircularsData, error: adminCircularsError } = useAdminCirculars(isAdmin ? userId : null)
    const { data: staffCircularsData, error: staffCircularsError } = useStaffCirculars(!isAdmin ? userId : null)

    // Debug logging for production issue
    useEffect(() => {
        console.log('[DEBUG] Dashboard Data Status:', {
            user: user ? { id: user.id.substring(0, 8) + '...', email: user.email } : null,
            profile: profile ? { role: profile.role, isActive: profile.is_active } : null,
            isAdmin,
            userId: userId?.substring(0, 8) + '...',
            employees: { count: employeesData?.length || 0, hasData: !!employeesData, error: employeesError?.message },
            assignedTasks: { count: assignedTasksData?.length || 0, hasData: !!assignedTasksData, error: assignedTasksError?.message },
            createdTasks: { count: createdTasksData?.length || 0, hasData: !!createdTasksData, error: createdTasksError?.message },
            adminTasks: { count: adminTasksWithAssignmentsData?.length || 0, hasData: !!adminTasksWithAssignmentsData, error: adminTasksError?.message },
            notifications: { count: notificationsData?.length || 0, hasData: !!notificationsData, error: notificationsError?.message },
            circulars: {
                admin: { count: adminCircularsData?.length || 0, error: adminCircularsError?.message },
                staff: { count: staffCircularsData?.length || 0, error: staffCircularsError?.message }
            }
        })
    }, [employeesData, assignedTasksData, createdTasksData, adminTasksWithAssignmentsData, notificationsData, adminCircularsData, staffCircularsData, user, profile, isAdmin, userId])

    // Derived data
    const employees = employeesData || []
    const tasks = assignedTasksData || []
    const adminTasks = adminTasksWithAssignmentsData || []
    const notifications = (notificationsData || []) as Notification[]
    const circulars = (isAdmin ? adminCircularsData : staffCircularsData) || []

    // Calculate stats from adminTasksWithAssignmentsData for real-time updates
    const allAdminAssignments = adminTasks.flatMap(t => t.assignments)

    const stats = isAdmin
        ? {
            pending: allAdminAssignments.filter(a => a.status === 'pending' || a.status === 'in_progress').length,
            completed: allAdminAssignments.filter(a => a.status === 'completed').length,
            total: allAdminAssignments.length
        }
        : {
            pending: tasks.filter(a => a.status === 'pending' || a.status === 'in_progress').length,
            completed: tasks.filter(a => a.status === 'completed').length,
            total: tasks.length
        }

    // Auth redirect - redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login')
        }
        // Check if account is suspended
        if (!authLoading && profile && profile.is_active === false) {
            const supabase = createSupabaseBrowser()
            supabase.auth.signOut()
            router.push('/login?suspended=true')
        }
    }, [authLoading, user, profile, router])

    // Refresh data - للتحديث اليدوي
    const loadData = useCallback(() => {
        if (userId) {
            mutate(mutationKeys.employees)
            mutate(mutationKeys.assignedTasks(userId))
            mutate(mutationKeys.notifications(userId))
            if (isAdmin) {
                mutate(mutationKeys.createdTasks(userId))
                mutate(mutationKeys.adminCirculars(userId))
            } else {
                mutate(mutationKeys.staffCirculars(userId))
            }
        }
    }, [userId, isAdmin])

    // Loading state - Wait for BOTH auth AND profile
    const loading = authLoading || (user && !profile)

    const handleSignOut = async () => {
        const supabase = createSupabaseBrowser()
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
            case 'employee-tasks':
                return <TasksListSkeleton count={4} />
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
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Harmuni Task</h1>
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

                        {/* Notifications Bell with Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                                className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadNotifications > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotificationsDropdown && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowNotificationsDropdown(false)}
                                    />

                                    {/* Dropdown Content */}
                                    <div className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                                        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                            <h3 className="font-bold text-slate-900 dark:text-white">التنبيهات</h3>
                                            {unreadNotifications > 0 && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {unreadNotifications} جديد
                                                </span>
                                            )}
                                        </div>

                                        <div className="max-h-72 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                                                    لا توجد تنبيهات
                                                </div>
                                            ) : (
                                                notifications.slice(0, 5).map(notification => (
                                                    <div
                                                        key={notification.id}
                                                        onClick={async () => {
                                                            if (!notification.is_read) {
                                                                // Optimistically update the local cache
                                                                mutateNotifications(
                                                                    (current: Notification[] | undefined) =>
                                                                        current?.map(n =>
                                                                            n.id === notification.id
                                                                                ? { ...n, is_read: true }
                                                                                : n
                                                                        ),
                                                                    false // Don't revalidate yet
                                                                )
                                                                // Then call the server action
                                                                await markNotificationReadAction(notification.id)
                                                                // Revalidate to get fresh data
                                                                mutateNotifications()
                                                            }
                                                        }}
                                                        className={`p-3 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notification.is_read ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                                                                }`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                                    {new Date(notification.created_at).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {notifications.length > 5 && (
                                            <button
                                                onClick={() => {
                                                    setShowNotificationsDropdown(false)
                                                    handleTabChange('notifications')
                                                }}
                                                className="w-full p-3 text-center text-sm text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                            >
                                                عرض المزيد ({notifications.length - 5})
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleSignOut}
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
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
                            <HomeTab stats={stats} profile={profile} employees={employees} />
                        )}
                        {activeTab === 'tasks' && (
                            <TasksTab
                                tasks={tasks}
                                adminTasks={adminTasks}
                                isAdmin={profile?.role === 'admin'}
                                isLoadingAdminTasks={isLoadingAdminTasks}
                                onRefresh={loadData}
                                mutateAdminTasks={mutateAdminTasks}
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
                            <NotificationsTab notifications={notifications} onRefresh={loadData} mutateNotifications={mutateNotifications} />
                        )}
                        {activeTab === 'profile' && (
                            <ProfileTab user={user} profile={profile} onSignOut={handleSignOut} />
                        )}
                        {activeTab === 'employee-tasks' && (
                            <EmployeeTasksTab />
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
                        onClick={() => handleTabChange('home')}
                    />
                    <NavItem
                        icon={<TasksIcon />}
                        label="المهام"
                        active={activeTab === 'tasks'}
                        onClick={() => handleTabChange('tasks')}
                        badge={stats.pending > 0 ? stats.pending : undefined}
                    />
                    <NavItem
                        icon={<CircularsIcon />}
                        label="التعاميم"
                        active={activeTab === 'circulars'}
                        onClick={() => handleTabChange('circulars')}
                        badge={unreadCirculars > 0 ? unreadCirculars : undefined}
                    />
                    <NavItem
                        icon={<EmployeesIcon />}
                        label="مهام الموظفين"
                        active={activeTab === 'employee-tasks'}
                        onClick={() => handleTabChange('employee-tasks')}
                    />
                    <NavItem
                        icon={<ProfileIcon />}
                        label="حسابي"
                        active={activeTab === 'profile'}
                        onClick={() => handleTabChange('profile')}
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
