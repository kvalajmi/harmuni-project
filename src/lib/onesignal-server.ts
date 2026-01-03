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
        console.log('[OneSignal Server] No users specified')
        return { success: false, error: 'No users specified' }
    }

    console.log('🔔 ═══════════════════════════════════════════')
    console.log('🔔 ONESIGNAL API REQUEST')
    console.log('🔔 User IDs:', JSON.stringify(userIds))
    console.log('🔔 Title:', title)
    console.log('🔔 Body:', body)
    console.log('🔔 ═══════════════════════════════════════════')

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                // Use include_aliases (new format) instead of deprecated include_external_user_ids
                include_aliases: {
                    external_id: userIds
                },
                target_channel: 'push', // CRITICAL: Only send push notifications, not email
                headings: { ar: title, en: title },
                contents: { ar: body, en: body },
                url: url || 'https://opsroom.vercel.app/dashboard',
                data: data || {},
                // iOS specific
                ios_badgeType: 'Increase',
                ios_badgeCount: 1
            })
        })

        const result = await response.json()
        console.log('[OneSignal Server] API Response:', JSON.stringify(result, null, 2))

        if (!response.ok) {
            console.error('[OneSignal Server] API error:', result)
            return { success: false, error: result.errors?.[0] || 'Failed to send notification' }
        }

        console.log('[OneSignal Server] Notification sent successfully, id:', result.id)
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
