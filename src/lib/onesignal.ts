'use client'

import { useEffect, useState } from 'react'

// OneSignal App ID
const ONESIGNAL_APP_ID = '6d710068-0d52-4ca5-8aa2-79d89d525c27'

declare global {
    interface Window {
        OneSignal: any
    }
}

export function useOneSignal() {
    const [isEnabled, setIsEnabled] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        initOneSignal()
    }, [])

    const initOneSignal = async () => {
        if (typeof window === 'undefined') return
        if (window.OneSignal) {
            setIsLoaded(true)
            checkStatus()
            return
        }

        // Load OneSignal SDK
        const script = document.createElement('script')
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
        script.defer = true
        script.onload = async () => {
            window.OneSignal = window.OneSignal || []

            await window.OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                allowLocalhostAsSecureOrigin: true,
                serviceWorkerPath: '/OneSignalSDKWorker.js',
                promptOptions: {
                    slidedown: {
                        prompts: [{
                            type: 'push',
                            autoPrompt: false,
                            text: {
                                acceptButton: 'السماح',
                                cancelButton: 'لاحقاً',
                                actionMessage: 'نريد إرسال إشعارات لك عند وجود مهام جديدة'
                            }
                        }]
                    }
                }
            })

            setIsLoaded(true)
            checkStatus()
        }
        document.head.appendChild(script)
    }

    const checkStatus = async () => {
        if (!window.OneSignal) return

        try {
            const permission = await window.OneSignal.Notifications.permission
            setIsEnabled(permission)
        } catch (error) {
            console.error('OneSignal status check error:', error)
        }
    }

    const requestPermission = async () => {
        if (!window.OneSignal) return false

        try {
            await window.OneSignal.Slidedown.promptPush()
            const permission = await window.OneSignal.Notifications.permission
            setIsEnabled(permission)
            return permission
        } catch (error) {
            console.error('OneSignal permission error:', error)
            return false
        }
    }

    const setExternalUserId = async (userId: string, email?: string, name?: string) => {
        if (!window.OneSignal) return

        try {
            await window.OneSignal.login(userId)
            if (email) {
                await window.OneSignal.User.addEmail(email)
            }
            if (name) {
                await window.OneSignal.User.addAlias('name', name)
            }
        } catch (error) {
            console.error('OneSignal set user error:', error)
        }
    }

    return {
        isLoaded,
        isEnabled,
        requestPermission,
        setExternalUserId,
        checkStatus
    }
}
