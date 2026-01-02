'use client'

import { useEffect, useState, useCallback } from 'react'

// OneSignal App ID
const ONESIGNAL_APP_ID = '6d710068-0d52-4ca5-8aa2-79d89d525c27'

declare global {
    interface Window {
        OneSignalDeferred: any[]
        OneSignal: any
    }
}

export function useOneSignal() {
    const [isEnabled, setIsEnabled] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const checkPermission = useCallback(async () => {
        if (typeof window === 'undefined') return false
        if (!window.OneSignal) return false

        try {
            const permission = await window.OneSignal.Notifications.permission
            setIsEnabled(permission)
            return permission
        } catch (err) {
            console.error('Check permission error:', err)
            return false
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return

        console.log('[OneSignal Hook] Starting initialization...')

        // Check if already loaded
        if (window.OneSignal && typeof window.OneSignal.init === 'function') {
            console.log('[OneSignal Hook] Already loaded, setting isLoaded=true')
            setIsLoaded(true)
            checkPermission()
            return
        }

        // OneSignal v16 initialization pattern
        console.log('[OneSignal Hook] Setting up OneSignalDeferred...')
        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push(async function (OneSignal: any) {
            try {
                console.log('[OneSignal Hook] Deferred callback executing, calling init...')
                await OneSignal.init({
                    appId: ONESIGNAL_APP_ID,
                    allowLocalhostAsSecureOrigin: true,
                    notifyButton: {
                        enable: false
                    }
                })
                console.log('[OneSignal Hook] Init successful, setting isLoaded=true')
                setIsLoaded(true)

                // Check current permission
                const perm = await OneSignal.Notifications.permission
                console.log('[OneSignal Hook] Permission status:', perm)
                setIsEnabled(perm)
            } catch (err: any) {
                console.error('[OneSignal Hook] Init error:', err)
                setError(err.message || 'Failed to initialize')
                setIsLoaded(true) // Still mark as loaded to stop "loading" state
            }
        })

        // Load the SDK script
        if (!document.querySelector('script[src*="OneSignalSDK"]')) {
            const script = document.createElement('script')
            script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
            script.defer = true
            script.async = true
            document.head.appendChild(script)
        }
    }, [checkPermission])

    const requestPermission = async (): Promise<boolean> => {
        if (typeof window === 'undefined' || !window.OneSignal) {
            setError('OneSignal not loaded')
            return false
        }

        try {
            // Check if already granted
            const currentPerm = await window.OneSignal.Notifications.permission
            if (currentPerm) {
                setIsEnabled(true)
                return true
            }

            // Request permission using native prompt
            await window.OneSignal.Notifications.requestPermission()

            // Check permission again
            const newPerm = await window.OneSignal.Notifications.permission
            setIsEnabled(newPerm)
            return newPerm
        } catch (err: any) {
            console.error('Request permission error:', err)
            setError(err.message || 'Failed to request permission')
            return false
        }
    }

    const setExternalUserId = async (userId: string, email?: string) => {
        if (typeof window === 'undefined' || !window.OneSignal) {
            console.log('[OneSignal] Not ready, skipping login')
            return
        }

        try {
            console.log('[OneSignal] Logging in with userId:', userId)
            await window.OneSignal.login(userId)
            console.log('[OneSignal] Login successful for:', userId)
            if (email) {
                await window.OneSignal.User.addEmail(email)
                console.log('[OneSignal] Email added:', email)
            }
        } catch (err) {
            console.error('[OneSignal] Set external user error:', err)
        }
    }

    return {
        isLoaded,
        isEnabled,
        error,
        requestPermission,
        setExternalUserId,
        checkPermission
    }
}
