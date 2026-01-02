'use client'

import { useState, useEffect } from 'react'
import { useOneSignal } from '@/lib/onesignal'

interface PushNotificationToggleProps {
    userId: string
    userEmail?: string
    userName?: string
}

export function PushNotificationToggle({ userId, userEmail }: PushNotificationToggleProps) {
    const { isLoaded, isEnabled, error, requestPermission, setExternalUserId } = useOneSignal()
    const [loading, setLoading] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)

    useEffect(() => {
        // Set user ID for targeting when loaded
        console.log('[Toggle] isLoaded:', isLoaded, 'userId:', userId, 'isEnabled:', isEnabled)
        if (isLoaded && userId) {
            console.log('[Toggle] Calling setExternalUserId...')
            setExternalUserId(userId, userEmail)
        }
    }, [isLoaded, userId, userEmail, setExternalUserId])

    // Check if notifications are supported
    const isSupported = typeof window !== 'undefined' && 'Notification' in window

    const handleToggle = async () => {
        if (loading) return

        if (!isSupported) {
            setLocalError('المتصفح لا يدعم الإشعارات')
            return
        }

        if (Notification.permission === 'denied') {
            setLocalError('تم رفض الإذن - افتح إعدادات المتصفح للتفعيل')
            return
        }

        if (isEnabled) {
            setLocalError('لإيقاف الإشعارات، اذهب لإعدادات المتصفح')
            return
        }

        setLoading(true)
        setLocalError(null)

        try {
            const granted = await requestPermission()
            if (!granted) {
                setLocalError('لم يتم منح الإذن')
            }
        } catch (err: any) {
            setLocalError(err.message || 'حدث خطأ')
        }

        setLoading(false)
    }

    // Determine display state
    const getStatusText = () => {
        if (!isSupported) return 'غير مدعوم في هذا المتصفح'
        if (!isLoaded) return 'جاري التحميل...'
        if (error) return `خطأ: ${error}`
        if (isEnabled) return 'مفعّلة ✓'
        if (Notification.permission === 'denied') return 'تم رفض الإذن'
        return 'غير مفعّلة - اضغط للتفعيل'
    }

    const getToggleColor = () => {
        if (!isSupported || !isLoaded) return 'bg-slate-400'
        if (isEnabled) return 'bg-green-500'
        if (Notification.permission === 'denied') return 'bg-red-400'
        return 'bg-slate-300 dark:bg-slate-600'
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl">
                <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">الإشعارات الفورية</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {loading ? 'جاري التفعيل...' : getStatusText()}
                    </p>
                </div>
                <button
                    onClick={handleToggle}
                    disabled={loading || !isLoaded || !isSupported}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${getToggleColor()} ${loading || !isLoaded ? 'cursor-wait' : 'cursor-pointer'
                        }`}
                >
                    <span
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${isEnabled ? 'right-1' : 'left-1'
                            }`}
                    />
                </button>
            </div>
            {localError && (
                <p className="text-sm text-red-500 px-4">{localError}</p>
            )}
        </div>
    )
}
