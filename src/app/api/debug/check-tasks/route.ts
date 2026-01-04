import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This is a debug endpoint - should be removed in production
export async function GET(request: Request) {
    // Only allow in development or with secret
    const authHeader = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const diagnostics: Record<string, unknown> = {}

    try {
        // 1. Total tasks
        const { count: totalTasks } = await supabaseAdmin
            .from('tasks')
            .select('*', { count: 'exact', head: true })
        diagnostics.totalTasks = totalTasks

        // 2. Archived tasks
        const { count: archivedTasks } = await supabaseAdmin
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('is_archived', true)
        diagnostics.archivedTasks = archivedTasks

        // 3. Total task assignments
        const { count: totalAssignments } = await supabaseAdmin
            .from('task_assignments')
            .select('*', { count: 'exact', head: true })
        diagnostics.totalAssignments = totalAssignments

        // 4. Orphaned assignments (assignments pointing to non-existent tasks)
        const { data: allAssignments } = await supabaseAdmin
            .from('task_assignments')
            .select('id, task_id, user_id')

        const { data: allTasks } = await supabaseAdmin
            .from('tasks')
            .select('id')

        const taskIds = new Set(allTasks?.map(t => t.id) || [])
        const orphanedAssignments = allAssignments?.filter(a => !taskIds.has(a.task_id)) || []
        diagnostics.orphanedAssignments = {
            count: orphanedAssignments.length,
            details: orphanedAssignments.slice(0, 10) // First 10
        }

        // 5. Assignments with archived tasks
        const { data: archivedTasksList } = await supabaseAdmin
            .from('tasks')
            .select('id')
            .eq('is_archived', true)

        const archivedTaskIds = new Set(archivedTasksList?.map(t => t.id) || [])
        const assignmentsWithArchivedTasks = allAssignments?.filter(a => archivedTaskIds.has(a.task_id)) || []
        diagnostics.assignmentsWithArchivedTasks = {
            count: assignmentsWithArchivedTasks.length,
            details: assignmentsWithArchivedTasks.slice(0, 10)
        }

        // 6. Recent notifications vs assignments
        const { data: recentNotifications } = await supabaseAdmin
            .from('notifications')
            .select('id, user_id, message, created_at')
            .ilike('message', '%مهمة%')
            .order('created_at', { ascending: false })
            .limit(10)
        diagnostics.recentTaskNotifications = recentNotifications

        // 7. Get all users and their assignment counts
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')

        const userAssignmentCounts = []
        for (const profile of profiles || []) {
            const { count } = await supabaseAdmin
                .from('task_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id)

            // Also check with the new query (inner join + not archived)
            const { data: visibleTasks } = await supabaseAdmin
                .from('task_assignments')
                .select(`
                    id,
                    task:tasks!inner(id, is_archived)
                `)
                .eq('user_id', profile.id)
                .eq('task.is_archived', false)

            userAssignmentCounts.push({
                userId: profile.id,
                name: profile.full_name,
                role: profile.role,
                totalAssignments: count,
                visibleAssignments: visibleTasks?.length || 0,
                hiddenAssignments: (count || 0) - (visibleTasks?.length || 0)
            })
        }
        diagnostics.userAssignmentCounts = userAssignmentCounts

        // 8. Check task_assignments table structure
        const { data: sampleAssignment } = await supabaseAdmin
            .from('task_assignments')
            .select('*')
            .limit(1)
            .single()
        diagnostics.sampleAssignmentStructure = sampleAssignment ? Object.keys(sampleAssignment) : []

        // 9. Recent tasks (last 5)
        const { data: recentTasks } = await supabaseAdmin
            .from('tasks')
            .select('id, title, created_at, is_archived')
            .order('created_at', { ascending: false })
            .limit(5)
        diagnostics.recentTasks = recentTasks

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            diagnostics
        }, { status: 200 })

    } catch (error) {
        console.error('Debug check error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
