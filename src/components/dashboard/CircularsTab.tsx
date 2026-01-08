'use client'

import React, { memo } from 'react'
import Link from 'next/link'
import { Circular } from '@/lib/circular-actions'

// Staff circular type with read status
interface StaffCircular extends Circular {
    is_read: boolean
    read_at: string | null
}

// Circulars Tab Component
const CircularsTab = memo(function CircularsTab({
    circulars,
    isAdmin,
    onRefresh
}: {
    circulars: any[]
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

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">التعاميم</h2>
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
                <div className="space-y-3">
                    {circulars.map((circular) => {
                        const isRead = 'is_read' in circular ? circular.is_read : true
                        return (
                            <Link
                                key={circular.id}
                                href={`/dashboard/circulars/${circular.id}`}
                                prefetch
                                className={`block bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/50 ${!isRead ? 'border-amber-400 dark:border-amber-500/50' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!isRead ? 'bg-amber-500/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                        <svg className={`w-5 h-5 ${!isRead ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                        </svg>
                                    </div>

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
})

export default CircularsTab