'use server'

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// VAPID Keys
const VAPID_PUBLIC_KEY = 'BMyPc7P0UcinueNsWvySaGNCLrFZef1lc53N1Dn0jn8o0-9n0lpfPM_kksNKe-jBbXVFWEF3FBqQpcHGVH3vBu4'
const VAPID_PRIVATE_KEY = 'Iy7_SlRfTBl4RTiHKTQjoHzXZB-KS8cF_rVhdINisd8'

// Configure web-push
webpush.setVapidDetails(
    'mailto:noreply@harmuni.org',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
)

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// Export public key for client
export async function getVapidPublicKey(): Promise<string> {
    return VAPID_PUBLIC_KEY
}

// Save push subscription for a user
export async function savePushSubscription(
    userId: string,
    subscription: PushSubscriptionJSON
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if subscription already exists
        const { data: existing } = await supabaseAdmin
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint)
            .single()

        if (existing) {
            // Update existing
            await supabaseAdmin
                .from('push_subscriptions')
                .update({ subscription: subscription })
                .eq('id', existing.id)
        } else {
            // Insert new
            await supabaseAdmin
                .from('push_subscriptions')
                .insert({
                    user_id: userId,
                    endpoint: subscription.endpoint,
                    subscription: subscription
                })
        }

        return { success: true }
    } catch (error) {
        console.error('Save push subscription error:', error)
        return { success: false, error: 'فشل في حفظ الاشتراك' }
    }
}

// Send push notification to a user
export async function sendPushNotification(
    userId: string,
    title: string,
    body: string,
    url?: string,
    tag?: string
): Promise<{ success: boolean; sent: number }> {
    try {
        // Get all subscriptions for this user
        const { data: subscriptions } = await supabaseAdmin
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', userId)

        if (!subscriptions || subscriptions.length === 0) {
            return { success: true, sent: 0 }
        }

        const payload = JSON.stringify({
            title,
            body,
            url: url || '/dashboard',
            tag: tag || 'ops-room'
        })

        let sent = 0
        const failedIds: string[] = []

        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(sub.subscription, payload)
                sent++
            } catch (error: any) {
                // If subscription is expired/invalid, mark for deletion
                if (error.statusCode === 410 || error.statusCode === 404) {
                    failedIds.push(sub.id)
                }
                console.error('Push send error:', error)
            }
        }

        // Clean up expired subscriptions
        if (failedIds.length > 0) {
            await supabaseAdmin
                .from('push_subscriptions')
                .delete()
                .in('id', failedIds)
        }

        return { success: true, sent }
    } catch (error) {
        console.error('Send push notification error:', error)
        return { success: false, sent: 0 }
    }
}

// Send push to multiple users
export async function sendPushToUsers(
    userIds: string[],
    title: string,
    body: string,
    url?: string
): Promise<{ success: boolean; totalSent: number }> {
    let totalSent = 0

    for (const userId of userIds) {
        const result = await sendPushNotification(userId, title, body, url)
        totalSent += result.sent
    }

    return { success: true, totalSent }
}
