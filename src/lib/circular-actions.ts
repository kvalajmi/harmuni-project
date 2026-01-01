'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q',
    { auth: { autoRefreshToken: false, persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY)

// ============== TYPES ==============

export interface Circular {
    id: string
    title: string
    content: string
    attachment_url: string | null
    created_by: string
    is_archived: boolean
    created_at: string
    updated_at: string
    creator_name?: string
    read_count?: number
    total_recipients?: number
}

export interface CircularRecipient {
    id: string
    circular_id: string
    user_id: string
    is_read: boolean
    read_at: string | null
    reminder_sent_at: string | null
    created_at: string
    user_name?: string
    user_email?: string
}

export interface CircularDetails extends Circular {
    recipients: CircularRecipient[]
}

// ============== CREATE CIRCULAR ==============

export interface CreateCircularInput {
    title: string
    content: string
    attachmentUrl?: string
    assignmentType: 'all' | 'group'
    groupId?: string
    createdBy: string
}

export async function createCircularAction(input: CreateCircularInput): Promise<{ success: boolean; error?: string; circularId?: string }> {
    try {
        const { title, content, attachmentUrl, assignmentType, groupId, createdBy } = input

        // 1. Create the circular
        const { data: circular, error: circularError } = await supabaseAdmin
            .from('circulars')
            .insert({
                title,
                content,
                attachment_url: attachmentUrl || null,
                created_by: createdBy
            })
            .select()
            .single()

        if (circularError || !circular) {
            console.error('Circular creation error:', circularError)
            return { success: false, error: 'فشل في إنشاء التعميم' }
        }

        // 2. Determine recipients
        let recipientIds: string[] = []

        if (assignmentType === 'all') {
            // Get all users except the creator
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .neq('id', createdBy)

            recipientIds = profiles?.map(p => p.id) || []
        } else if (assignmentType === 'group' && groupId) {
            // Get group members
            const { data: members } = await supabaseAdmin
                .from('group_members')
                .select('user_id')
                .eq('group_id', groupId)

            recipientIds = members?.map(m => m.user_id).filter(id => id !== createdBy) || []
        }

        // 3. Create recipient records
        if (recipientIds.length > 0) {
            const recipients = recipientIds.map(userId => ({
                circular_id: circular.id,
                user_id: userId,
                is_read: false
            }))

            const { error: recipientError } = await supabaseAdmin
                .from('circular_recipients')
                .insert(recipients)

            if (recipientError) {
                console.error('Recipient creation error:', recipientError)
            }

            // 4. Create notifications for recipients
            const notifications = recipientIds.map(userId => ({
                user_id: userId,
                message: `تعميم جديد: ${title}`,
                related_task_id: null,
                is_read: false
            }))

            await supabaseAdmin.from('notifications').insert(notifications)
        }

        revalidatePath('/dashboard')
        return { success: true, circularId: circular.id }

    } catch (error) {
        console.error('Create circular error:', error)
        return { success: false, error: 'حدث خطأ غير متوقع' }
    }
}

// ============== GET CIRCULARS (ADMIN) ==============

export async function getAdminCircularsAction(userId: string): Promise<Circular[]> {
    try {
        const { data: circulars, error } = await supabaseAdmin
            .from('circulars')
            .select('*')
            .eq('created_by', userId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })

        if (error || !circulars) return []

        // Get read counts for each circular
        const circularIds = circulars.map(c => c.id)
        const { data: recipients } = await supabaseAdmin
            .from('circular_recipients')
            .select('circular_id, is_read')
            .in('circular_id', circularIds)

        const countMap = new Map<string, { read: number; total: number }>()
        recipients?.forEach(r => {
            const existing = countMap.get(r.circular_id) || { read: 0, total: 0 }
            existing.total++
            if (r.is_read) existing.read++
            countMap.set(r.circular_id, existing)
        })

        return circulars.map(c => ({
            ...c,
            read_count: countMap.get(c.id)?.read || 0,
            total_recipients: countMap.get(c.id)?.total || 0
        }))

    } catch (error) {
        console.error('Get admin circulars error:', error)
        return []
    }
}

// ============== GET CIRCULARS (STAFF) ==============

export async function getStaffCircularsAction(userId: string): Promise<(Circular & { is_read: boolean; read_at: string | null })[]> {
    try {
        // Get circulars where user is a recipient
        const { data: recipientRecords, error } = await supabaseAdmin
            .from('circular_recipients')
            .select(`
                is_read,
                read_at,
                circular:circulars(*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error || !recipientRecords) return []

        // Get creator names
        const creatorIds = [...new Set(recipientRecords.map(r => {
            const circular = r.circular as unknown as Circular
            return circular?.created_by
        }).filter(Boolean))]

        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .in('id', creatorIds)

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

        return recipientRecords
            .filter(r => r.circular)
            .map(r => {
                const circular = r.circular as unknown as Circular
                return {
                    ...circular,
                    is_read: r.is_read,
                    read_at: r.read_at,
                    creator_name: profileMap.get(circular.created_by) || 'مدير النظام'
                }
            })
            .filter(c => !c.is_archived)

    } catch (error) {
        console.error('Get staff circulars error:', error)
        return []
    }
}

// ============== GET CIRCULAR DETAILS ==============

export async function getCircularDetailsAction(circularId: string): Promise<CircularDetails | null> {
    try {
        // Get circular
        const { data: circular, error: circularError } = await supabaseAdmin
            .from('circulars')
            .select('*')
            .eq('id', circularId)
            .single()

        if (circularError || !circular) return null

        // Get creator name
        const { data: creatorProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', circular.created_by)
            .single()

        // Get recipients with user info
        const { data: recipients } = await supabaseAdmin
            .from('circular_recipients')
            .select('*')
            .eq('circular_id', circularId)
            .order('is_read', { ascending: true })

        // Get user profiles and emails
        const userIds = recipients?.map(r => r.user_id) || []
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds)

        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
        const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || [])
        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

        return {
            ...circular,
            creator_name: creatorProfile?.full_name || 'مدير النظام',
            read_count: recipients?.filter(r => r.is_read).length || 0,
            total_recipients: recipients?.length || 0,
            recipients: recipients?.map(r => ({
                ...r,
                user_name: profileMap.get(r.user_id) || 'مستخدم',
                user_email: emailMap.get(r.user_id) || ''
            })) || []
        }

    } catch (error) {
        console.error('Get circular details error:', error)
        return null
    }
}

// ============== MARK AS READ ==============

export async function markCircularAsReadAction(circularId: string, userId: string): Promise<{ success: boolean }> {
    try {
        const { error } = await supabaseAdmin
            .from('circular_recipients')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('circular_id', circularId)
            .eq('user_id', userId)

        if (error) {
            console.error('Mark as read error:', error)
            return { success: false }
        }

        revalidatePath(`/dashboard/circulars/${circularId}`)
        revalidatePath('/dashboard')
        return { success: true }

    } catch (error) {
        console.error('Mark as read error:', error)
        return { success: false }
    }
}

// ============== SEND REMINDER ==============

export async function sendCircularReminderAction(
    circularId: string,
    recipientUserId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get circular details
        const { data: circular } = await supabaseAdmin
            .from('circulars')
            .select('title')
            .eq('id', circularId)
            .single()

        if (!circular) {
            return { success: false, error: 'التعميم غير موجود' }
        }

        // Get user email
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const user = users?.find(u => u.id === recipientUserId)

        if (!user?.email) {
            return { success: false, error: 'البريد الإلكتروني غير موجود' }
        }

        // Get user name
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', recipientUserId)
            .single()

        const userName = profile?.full_name || 'الموظف'
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Send reminder email
        await resend.emails.send({
            from: 'Ops Room <noreply@resend.dev>',
            to: user.email,
            subject: `تذكير: يرجى قراءة التعميم - ${circular.title}`,
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #1e40af;">تذكير بقراءة التعميم</h2>
                    <p>مرحباً ${userName}،</p>
                    <p>نود تذكيرك بأن هناك تعميم لم تقم بقراءته بعد:</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong>${circular.title}</strong>
                    </div>
                    <p>يرجى الدخول إلى النظام وقراءة التعميم وتأكيد الاستلام.</p>
                    <a href="${appUrl}/dashboard/circulars/${circularId}"
                       style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
                        قراءة التعميم
                    </a>
                    <p style="color: #6b7280; margin-top: 20px; font-size: 14px;">
                        Ops Room - نظام إدارة المهام
                    </p>
                </div>
            `
        })

        // Update reminder sent timestamp
        await supabaseAdmin
            .from('circular_recipients')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('circular_id', circularId)
            .eq('user_id', recipientUserId)

        // Create notification
        await supabaseAdmin.from('notifications').insert({
            user_id: recipientUserId,
            message: `تذكير: يرجى قراءة التعميم "${circular.title}"`,
            is_read: false
        })

        revalidatePath(`/dashboard/circulars/${circularId}`)
        return { success: true }

    } catch (error) {
        console.error('Send reminder error:', error)
        return { success: false, error: 'فشل في إرسال التذكير' }
    }
}

// ============== ARCHIVE CIRCULAR ==============

export async function archiveCircularAction(circularId: string): Promise<{ success: boolean }> {
    try {
        await supabaseAdmin
            .from('circulars')
            .update({ is_archived: true })
            .eq('id', circularId)

        revalidatePath('/dashboard')
        return { success: true }

    } catch (error) {
        console.error('Archive circular error:', error)
        return { success: false }
    }
}

// ============== GET UNREAD CIRCULARS COUNT ==============

export async function getUnreadCircularsCountAction(userId: string): Promise<number> {
    try {
        const { count, error } = await supabaseAdmin
            .from('circular_recipients')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false)

        if (error) return 0
        return count || 0

    } catch (error) {
        console.error('Get unread count error:', error)
        return 0
    }
}
