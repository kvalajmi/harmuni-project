import { Skeleton } from '@/components/ui/skeleton'

// Stats Cards Skeleton
export function StatsCardsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
                <div key={i} className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
                    <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-24" />
                </div>
            ))}
        </div>
    )
}

// Welcome Card Skeleton
export function WelcomeCardSkeleton() {
    return (
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
        </div>
    )
}

// Single Task Item Skeleton
function TaskItemSkeleton() {
    return (
        <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg shrink-0" />
        </div>
    )
}

// Tasks List Skeleton
export function TasksListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {Array.from({ length: count }).map((_, i) => (
                    <TaskItemSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

// Admin Task Item Skeleton (with assignment count)
function AdminTaskItemSkeleton() {
    return (
        <div className="p-4 flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700/50 last:border-0">
            <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
            </div>
            <div className="text-left shrink-0 space-y-2">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-3 w-12" />
            </div>
        </div>
    )
}

// Admin Tasks List Skeleton
export function AdminTasksListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                {Array.from({ length: count }).map((_, i) => (
                    <AdminTaskItemSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

// Circular Item Skeleton
function CircularItemSkeleton() {
    return (
        <div className="p-4 flex items-start gap-3 border-b border-slate-200 dark:border-slate-700/50 last:border-0">
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-6 w-16 rounded-lg shrink-0" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-24 mt-1" />
            </div>
        </div>
    )
}

// Circulars List Skeleton
export function CircularsListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                {Array.from({ length: count }).map((_, i) => (
                    <CircularItemSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

// Notification Item Skeleton
function NotificationItemSkeleton() {
    return (
        <div className="p-4 flex items-start gap-3">
            <Skeleton className="w-2 h-2 rounded-full mt-2 shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
    )
}

// Notifications List Skeleton
export function NotificationsListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 shadow-sm">
                {Array.from({ length: count }).map((_, i) => (
                    <NotificationItemSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

// Home Tab Full Skeleton
export function HomeTabSkeleton() {
    return (
        <div className="space-y-6">
            <WelcomeCardSkeleton />
            <StatsCardsSkeleton />
            <TasksListSkeleton count={3} />
        </div>
    )
}

// Task Details Page Skeleton
export function TaskDetailsSkeleton() {
    return (
        <div className="space-y-4">
            {/* Task Info Card */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-6 w-20 rounded-lg" />
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
            </div>

            {/* Assignments Table */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <Skeleton className="h-5 w-40" />
                </div>
                <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Circular Details Page Skeleton
export function CircularDetailsSkeleton() {
    return (
        <div className="space-y-4">
            {/* Circular Info Card */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-6 w-20 rounded-lg" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
            </div>

            {/* Recipients List */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-20 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
