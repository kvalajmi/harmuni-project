'use client'

import { useState, useEffect } from 'react'
import { getVapidPublicKey, savePushSubscription } from '@/lib/push'

// Convert base64 url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

interface PushNotificationToggleProps {
    userId: string
}

export function PushNotificationToggle({ userId }: PushNotificationToggleProps) {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission)
        }
        checkSubscription()
    }, [])

    const checkSubscription = async () => {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        }
    }

    const subscribe = async () => {
        setLoading(true)
        try {
            // Request permission
            const perm = await Notification.requestPermission()
            setPermission(perm)

            if (perm !== 'granted') {
                setLoading(false)
                return
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready

            // Subscribe to push
            const vapidPublicKey = await getVapidPublicKey()
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey.buffer as ArrayBuffer
            })

            // Save to server
            const result = await savePushSubscription(userId, subscription.toJSON())
            if (result.success) {
                setIsSubscribed(true)
            }
        } catch (error) {
            console.error('Push subscription error:', error)
        }
        setLoading(false)
    }

    const unsubscribe = async () => {
        setLoading(true)
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                await subscription.unsubscribe()
                setIsSubscribed(false)
            }
        } catch (error) {
            console.error('Unsubscribe error:', error)
        }
        setLoading(false)
    }

    // Not supported
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return (
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl">
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">الإشعارات</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">غير مدعومة في هذا المتصفح</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl">
            <div>
                <p className="font-medium text-slate-900 dark:text-white">الإشعارات الفورية</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isSubscribed ? 'مفعّلة - ستصلك إشعارات المهام والتعاميم' : 'غير مفعّلة'}
                </p>
            </div>
            <button
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={loading || permission === 'denied'}
                className={`relative w-14 h-8 rounded-full transition-colors ${isSubscribed
                    ? 'bg-green-500'
                    : permission === 'denied'
                        ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
            >
                <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${isSubscribed ? 'right-1' : 'left-1'
                        }`}
                />
            </button>
        </div>
    )
}
