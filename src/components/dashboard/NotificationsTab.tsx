'use client'

import React, { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Notification } from '@/lib/supabase'
import { markNotificationReadAction } from '@/lib/staff-actions'

// Notifications Tab Component
const NotificationsTab = memo(function NotificationsTab({
    notifications,
    onRefresh,
    mutateNotifications
}: {
    notifications: Notification[]
    onRefresh: () => void
    mutateNotifications: (data?: Notification[] | ((current: Notification[] | undefined) => Notification[] | undefined), shouldRevalidate?: boolean) => void
}) {
    const router = useRouter()

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read using optimistic update
        if (!notification.is_read) {
            // Optimistically update the local cache
            mutateNotifications(
                (current: Notification[] | undefined) =>
                    current?.map(n =>
                        n.id === notification.id
                            ? { ...n, is_read: true }
                            : n
                    ),
                false
            )
            // Call server action
            await markNotificationReadAction(notification.id)
            // Revalidate
            mutateNotifications()
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
                                            {new Date(notification.created_at).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
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
})

export default NotificationsTab