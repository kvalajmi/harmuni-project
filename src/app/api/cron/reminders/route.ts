import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReminderEmail } from '@/lib/email'

// Supabase Admin Client - created lazily to avoid build-time errors
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error('Supabase environment variables not configured')
    }

    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
}

// OneSignal Configuration
const ONESIGNAL_APP_ID = '6d710068-0d52-4ca5-8aa2-79d89d525c27'
const ONESIGNAL_REST_API_KEY = 'os_v2_app_nvyqa2ankjgklcvcphmj2us4e767ntwyf4lu5o5u4ujixrlk6bsp5egys46zvwjqzxyhqan3k2psu2fcktoirnvpg7ezrwlncbzltbq'

// OneSignal function - using external_id (same as your existing system)
async function sendPushNotification(userIds: string[], title: string, body: string, notificationUrl: string) {
    if (userIds.length === 0) {
        console.log('[Reminder] No users to notify')
        return
    }

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                // Use include_aliases with external_id (matches your existing setup)
                include_aliases: {
                    external_id: userIds
                },
                target_channel: 'push',
                headings: { ar: title, en: title },
                contents: { ar: body, en: body },
                url: notificationUrl
            })
        })

        const result = await response.json()
        console.log('[Reminder] Push sent:', result.id || result)
    } catch (error) {
        console.error('[Reminder] Push error:', error)
    }
}

// Main handler
export async function GET(request: Request) {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow without auth in development
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    console.log('[Reminder Cron] Starting at', new Date().toISOString())

    const supabaseAdmin = getSupabaseAdmin()
    const SIX_HOURS_AGO = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    let taskReminders = 0
    let circularReminders = 0

    try {
        // ========================================
        // 1. PENDING TASKS REMINDERS
        // ========================================
        const { data: pendingAssignments, error: tasksError } = await supabaseAdmin
            .from('task_assignments')
            .select(`
                id,
                user_id,
                task_id,
                reminder_sent_at,
                task:tasks(id, title, status)
            `)
            .in('status', ['pending', 'in_progress'])
            .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${SIX_HOURS_AGO}`)

        if (tasksError) {
            console.error('[Reminder] Tasks query error:', tasksError)
        } else if (pendingAssignments && pendingAssignments.length > 0) {
            console.log(`[Reminder] Found ${pendingAssignments.length} pending task assignments`)

            // Filter out completed tasks and group by user
            type TaskAssignment = {
                id: string
                user_id: string
                task_id: string
                reminder_sent_at: string | null
                task: unknown
            }

            const validAssignments = (pendingAssignments as TaskAssignment[]).filter((a: TaskAssignment) => {
                const task = a.task as { id: string; title: string; status: string } | null
                return task && task.status !== 'completed'
            })

            const userTasksMap = new Map<string, { id: string; taskId: string; title: string }[]>()

            for (const assignment of validAssignments) {
                const task = assignment.task as { id: string; title: string; status: string }
                const existing = userTasksMap.get(assignment.user_id) || []
                existing.push({
                    id: assignment.id,
                    taskId: task.id,
                    title: task.title
                })
                userTasksMap.set(assignment.user_id, existing)
            }

            // Get user profiles for email
            const userIds = Array.from(userTasksMap.keys())
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email:id')
                .in('id', userIds)

            // Also get auth emails
            const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
            const authEmailMap = new Map(authUsers?.map(u => [u.id, u.email]) || [])

            const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

            // Send notifications per user
            for (const [userId, tasks] of userTasksMap.entries()) {
                const taskCount = tasks.length
                const title = `📋 تذكير: لديك ${taskCount} مهمة معلقة`
                const body = taskCount === 1
                    ? tasks[0].title
                    : `${tasks[0].title} و ${taskCount - 1} مهام أخرى`
                const url = taskCount === 1
                    ? `https://opsroom.vercel.app/dashboard/tasks/${tasks[0].taskId}`
                    : 'https://opsroom.vercel.app/dashboard?tab=tasks'

                // Send Push Notification
                await sendPushNotification([userId], title, body, url)

                // Send Email
                const userEmail = authEmailMap.get(userId)
                const userName = profileMap.get(userId) || 'مستخدم'
                if (userEmail) {
                    await sendReminderEmail({
                        to: userEmail,
                        recipientName: userName,
                        type: 'task',
                        items: tasks.map(t => ({
                            title: t.title,
                            url: `https://opsroom.vercel.app/dashboard/tasks/${t.taskId}`
                        }))
                    })
                }

                // Update reminder_sent_at
                const assignmentIds = tasks.map(t => t.id)
                await supabaseAdmin
                    .from('task_assignments')
                    .update({ reminder_sent_at: new Date().toISOString() })
                    .in('id', assignmentIds)

                taskReminders += taskCount
            }
        }

        // ========================================
        // 2. UNREAD CIRCULARS REMINDERS
        // ========================================
        const { data: unreadCirculars, error: circularsError } = await supabaseAdmin
            .from('circular_recipients')
            .select(`
                id,
                user_id,
                circular_id,
                last_reminder_at,
                circular:circulars(id, title)
            `)
            .eq('is_read', false)
            .or(`last_reminder_at.is.null,last_reminder_at.lt.${SIX_HOURS_AGO}`)

        if (circularsError) {
            console.error('[Reminder] Circulars query error:', circularsError)
        } else if (unreadCirculars && unreadCirculars.length > 0) {
            console.log(`[Reminder] Found ${unreadCirculars.length} unread circulars`)

            // Group by user
            type CircularRecipient = {
                id: string
                user_id: string
                circular_id: string
                last_reminder_at: string | null
                circular: unknown
            }

            const userCircularsMap = new Map<string, { id: string; circularId: string; title: string }[]>()

            for (const recipient of unreadCirculars as CircularRecipient[]) {
                const circular = recipient.circular as { id: string; title: string } | null
                if (!circular) continue

                const existing = userCircularsMap.get(recipient.user_id) || []
                existing.push({
                    id: recipient.id,
                    circularId: circular.id,
                    title: circular.title
                })
                userCircularsMap.set(recipient.user_id, existing)
            }

            // Get user profiles for email (if not already fetched)
            const circularUserIds = Array.from(userCircularsMap.keys())
            const { data: circularProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name')
                .in('id', circularUserIds)

            const { data: { users: circularAuthUsers } } = await supabaseAdmin.auth.admin.listUsers()
            const circularAuthEmailMap = new Map(circularAuthUsers?.map(u => [u.id, u.email]) || [])
            const circularProfileMap = new Map(circularProfiles?.map(p => [p.id, p.full_name]) || [])

            // Send notifications per user
            for (const [userId, circulars] of userCircularsMap.entries()) {
                const count = circulars.length
                const title = `📢 تذكير: لديك ${count} تعميم لم تقرأه`
                const body = count === 1
                    ? circulars[0].title
                    : `${circulars[0].title} و ${count - 1} تعاميم أخرى`
                const url = count === 1
                    ? `https://opsroom.vercel.app/dashboard/circulars/${circulars[0].circularId}`
                    : 'https://opsroom.vercel.app/dashboard?tab=circulars'

                // Send Push Notification
                await sendPushNotification([userId], title, body, url)

                // Send Email
                const userEmail = circularAuthEmailMap.get(userId)
                const userName = circularProfileMap.get(userId) || 'مستخدم'
                if (userEmail) {
                    await sendReminderEmail({
                        to: userEmail,
                        recipientName: userName,
                        type: 'circular',
                        items: circulars.map(c => ({
                            title: c.title,
                            url: `https://opsroom.vercel.app/dashboard/circulars/${c.circularId}`
                        }))
                    })
                }

                // Update last_reminder_at
                const recipientIds = circulars.map(c => c.id)
                await supabaseAdmin
                    .from('circular_recipients')
                    .update({ last_reminder_at: new Date().toISOString() })
                    .in('id', recipientIds)

                circularReminders += count
            }
        }

        console.log(`[Reminder Cron] Done. Tasks: ${taskReminders}, Circulars: ${circularReminders}`)

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            reminders: {
                tasks: taskReminders,
                circulars: circularReminders
            }
        })

    } catch (error) {
        console.error('[Reminder Cron] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
