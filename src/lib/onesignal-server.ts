'use server'

// OneSignal Server-side API for sending push notifications
const ONESIGNAL_APP_ID = '6d710068-0d52-4ca5-8aa2-79d89d525c27'
const ONESIGNAL_REST_API_KEY = 'os_v2_app_nvyqa2ankjgklcvcphmj2us4e767ntwyf4lu5o5u4ujixrlk6bsp5egys46zvwjqzxyhqan3k2psu2fcktoirnvpg7ezrwlncbzltbq'

interface SendNotificationOptions {
    userIds: string[]
    title: string
    body: string
    url?: string
    data?: Record<string, string>
}

// Send push notification to specific users via OneSignal
export async function sendPushNotificationAction(options: SendNotificationOptions): Promise<{ success: boolean; error?: string }> {
    const { userIds, title, body, url, data } = options

    if (!userIds || userIds.length === 0) {
        return { success: false, error: 'No users specified' }
    }

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_aliases: {
                    external_id: userIds
                },
                target_channel: 'push',
                headings: { ar: title, en: title },
                contents: { ar: body, en: body },
                url: url || 'https://opsroom.vercel.app/dashboard',
                data: data || {},
                // iOS specific
                ios_badgeType: 'Increase',
                ios_badgeCount: 1,
                // Android specific
                android_channel_id: 'default',
                // Web specific
                chrome_web_badge: 'https://opsroom.vercel.app/icon-192x192.png'
            })
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('OneSignal API error:', result)
            return { success: false, error: result.errors?.[0] || 'Failed to send notification' }
        }

        console.log('OneSignal notification sent:', result.id)
        return { success: true }
    } catch (error: any) {
        console.error('OneSignal send error:', error)
        return { success: false, error: error.message || 'Network error' }
    }
}

// Send notification to all users who subscribed
export async function sendPushToAllAction(title: string, body: string, url?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                included_segments: ['Subscribed Users'],
                headings: { ar: title, en: title },
                contents: { ar: body, en: body },
                url: url || 'https://opsroom.vercel.app/dashboard'
            })
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('OneSignal broadcast error:', result)
            return { success: false, error: result.errors?.[0] || 'Failed to send broadcast' }
        }

        return { success: true }
    } catch (error: any) {
        console.error('OneSignal broadcast error:', error)
        return { success: false, error: error.message || 'Network error' }
    }
}
