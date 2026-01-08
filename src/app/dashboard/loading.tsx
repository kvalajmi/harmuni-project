import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950/20">
            <div className="container mx-auto p-4 pb-20 max-w-7xl">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div>
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="w-10 h-10 rounded-lg" />
                    </div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
                            <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>

                {/* Content Area Skeleton */}
                <div className="space-y-4">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-20" />
                    </div>

                    {/* List Items */}
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-4 flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-lg shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Navigation Skeleton */}
                <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-5 max-w-lg mx-auto">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex flex-col items-center justify-center p-3">
                                <Skeleton className="w-6 h-6 mb-1" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}