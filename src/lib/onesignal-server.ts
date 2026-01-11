'use server'

// OneSignal Server-side API for sending push notifications
// Keys loaded from environment variables for security
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '6d710068-0d52-4ca5-8aa2-79d89d525c27'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''

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

    if (!ONESIGNAL_REST_API_KEY) {
        console.error('[OneSignal] API key not configured')
        return { success: false, error: 'OneSignal not configured' }
    }

    try {
        console.log(`[OneSignal] Sending notification to ${userIds.length} users`)
        
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                // Use include_aliases with external_id (correct format for OneSignal v16)
                include_aliases: {
                    external_id: userIds  // Array of user IDs
                },
                target_channel: 'push',
                headings: { ar: title, en: title },
                contents: { ar: body, en: body },
                url: url || 'https://harmuni.org/dashboard',
                data: data || {},
                // iOS specific
                ios_badgeType: 'Increase',
                ios_badgeCount: 1,
                // Web push specific
                web_url: url || 'https://harmuni.org/dashboard',
                // Priority
                priority: 10
            })
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('[OneSignal] API Error Response:', JSON.stringify(result, null, 2))
            const errorMsg = result.errors?.[0] || result.error || 'Unknown error'
            return { success: false, error: errorMsg }
        }

        console.log('[OneSignal] Success! Notification ID:', result.id, 'Recipients:', result.recipients)
        return { success: true }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Network error'
        console.error('[OneSignal] Exception:', errorMessage)
        return { success: false, error: errorMessage }
    }
}

// Send notification to all users who subscribed
export async function sendPushToAllAction(title: string, body: string, url?: string): Promise<{ success: boolean; error?: string }> {
    if (!ONESIGNAL_REST_API_KEY) {
        return { success: false, error: 'OneSignal not configured' }
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
                included_segments: ['Subscribed Users'],
                headings: { ar: title, en: title },
                contents: { ar: body, en: body },
                url: url || 'https://harmuni.org/dashboard'
            })
        })

        const result = await response.json()

        if (!response.ok) {
            return { success: false, error: result.errors?.[0] || 'Failed to send broadcast' }
        }

        return { success: true }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Network error'
        return { success: false, error: errorMessage }
    }
}
