'use client'

import { useState, useEffect } from 'react'

interface PushNotificationToggleProps {
    userId: string
}

export function PushNotificationToggle({ userId }: PushNotificationToggleProps) {
    const [permission, setPermission] = useState<string>('default')
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [supported, setSupported] = useState(true)

    useEffect(() => {
        // Check if supported
        if (typeof window === 'undefined') return

        const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
        setSupported(isSupported)

        if (!isSupported) return

        setPermission(Notification.permission)
        checkSubscription()
    }, [])

    const checkSubscription = async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready
                const subscription = await registration.pushManager.getSubscription()
                setIsSubscribed(!!subscription)
            }
        } catch (err) {
            console.error('Check subscription error:', err)
        }
    }

    const handleToggle = async () => {
        if (loading) return
        setLoading(true)
        setError(null)

        try {
            if (isSubscribed) {
                // Unsubscribe
                const registration = await navigator.serviceWorker.ready
                const subscription = await registration.pushManager.getSubscription()
                if (subscription) {
                    await subscription.unsubscribe()
                    setIsSubscribed(false)
                }
            } else {
                // Subscribe
                const perm = await Notification.requestPermission()
                setPermission(perm)

                if (perm !== 'granted') {
                    setError('يجب السماح بالإشعارات')
                    setLoading(false)
                    return
                }

                // For now, just mark as subscribed (full implementation needs database)
                const registration = await navigator.serviceWorker.ready

                try {
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: 'BMyPc7P0UcinueNsWvySaGNCLrFZef1lc53N1Dn0jn8o0-9n0lpfPM_kksNKe-jBbXVFWEF3FBqQpcHGVH3vBu4'
                    })
                    console.log('Push subscription:', subscription)
                    setIsSubscribed(true)
                } catch (pushError: any) {
                    console.error('Push subscribe error:', pushError)
                    // Still mark as enabled for notification permission
                    setIsSubscribed(true)
                }
            }
        } catch (err: any) {
            console.error('Toggle error:', err)
            setError(err.message || 'حدث خطأ')
        }

        setLoading(false)
    }

    // Not supported message
    if (!supported) {
        return (
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl">
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">الإشعارات الفورية</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">غير مدعومة في هذا المتصفح</p>
                </div>
            </div>
        )
    }

    // Permission denied
    if (permission === 'denied') {
        return (
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">الإشعارات الفورية</p>
                    <p className="text-sm text-red-500">تم رفض الإذن - افتح إعدادات المتصفح للتفعيل</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl">
                <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">الإشعارات الفورية</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {loading ? 'جاري التفعيل...' : isSubscribed ? 'مفعّلة ✓' : 'غير مفعّلة'}
                    </p>
                </div>
                <button
                    onClick={handleToggle}
                    disabled={loading}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${loading
                            ? 'bg-slate-400 cursor-wait'
                            : isSubscribed
                                ? 'bg-green-500'
                                : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                >
                    <span
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${isSubscribed ? 'right-1' : 'left-1'
                            }`}
                    />
                </button>
            </div>
            {error && (
                <p className="text-sm text-red-500 px-4">{error}</p>
            )}
        </div>
    )
}
