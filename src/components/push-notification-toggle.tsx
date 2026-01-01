'use client'

import { useState, useEffect } from 'react'
import { useOneSignal } from '@/lib/onesignal'

interface PushNotificationToggleProps {
    userId: string
    userEmail?: string
    userName?: string
}

export function PushNotificationToggle({ userId, userEmail, userName }: PushNotificationToggleProps) {
    const { isLoaded, isEnabled, requestPermission, setExternalUserId } = useOneSignal()
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled' | 'unsupported'>('loading')

    useEffect(() => {
        if (!isLoaded) {
            setStatus('loading')
            return
        }

        // Check if notifications are supported
        if (!('Notification' in window)) {
            setStatus('unsupported')
            return
        }

        if (Notification.permission === 'denied') {
            setStatus('disabled')
            return
        }

        setStatus(isEnabled ? 'enabled' : 'disabled')

        // Set user ID for targeting
        if (userId && isLoaded) {
            setExternalUserId(userId, userEmail, userName)
        }
    }, [isLoaded, isEnabled, userId, userEmail, userName])

    const handleToggle = async () => {
        if (loading || status === 'unsupported') return

        setLoading(true)

        if (status === 'enabled') {
            // Can't programmatically disable - show message
            setLoading(false)
            alert('لإيقاف الإشعارات، اذهب لإعدادات المتصفح')
            return
        }

        // Request permission
        const granted = await requestPermission()
        setStatus(granted ? 'enabled' : 'disabled')
        setLoading(false)
    }

    // Unsupported
    if (status === 'unsupported') {
        return (
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl">
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">الإشعارات الفورية</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">غير مدعومة في هذا المتصفح</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl">
            <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-white">الإشعارات الفورية</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {status === 'loading' ? 'جاري التحميل...' :
                        status === 'enabled' ? 'مفعّلة ✓' :
                            'غير مفعّلة - اضغط للتفعيل'}
                </p>
            </div>
            <button
                onClick={handleToggle}
                disabled={loading || status === 'loading'}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${loading || status === 'loading'
                        ? 'bg-slate-400 cursor-wait'
                        : status === 'enabled'
                            ? 'bg-green-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                    }`}
            >
                <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${status === 'enabled' ? 'right-1' : 'left-1'
                        }`}
                />
            </button>
        </div>
    )
}
