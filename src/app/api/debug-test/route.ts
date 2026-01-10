import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim()

    // Debug environment
    console.log('[API DEBUG] Environment check:', {
        hasUrl: !!supabaseUrl,
        urlStart: supabaseUrl?.substring(0, 30) + '...',
        hasServiceKey: !!serviceKey,
        keyStart: serviceKey?.substring(0, 10) + '...',
        nodeEnv: process.env.NODE_ENV
    })

    const results = {
        environment: {
            hasSupabaseUrl: !!supabaseUrl,
            urlStart: supabaseUrl?.substring(0, 30) + '...',
            hasServiceKey: !!serviceKey,
            nodeEnv: process.env.NODE_ENV
        },
        tests: {
            profiles: null,
            tasks: null,
            taskAssignments: null,
            error: null
        }
    }

    if (!supabaseUrl || !serviceKey) {
        results.tests.error = 'Missing environment variables'
        return NextResponse.json(results)
    }

    // Create admin client with service key
    const supabaseAdmin = createClient(
        supabaseUrl,
        serviceKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    try {
        // Test 1: Get profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .limit(5)

        console.log('[API DEBUG] Profiles query:', {
            hasData: !!profiles,
            count: profiles?.length || 0,
            error: profilesError?.message || null
        })

        results.tests.profiles = {
            success: !profilesError,
            count: profiles?.length || 0,
            error: profilesError?.message || null,
            sample: profiles?.[0] ? {
                id: profiles[0].id.substring(0, 8) + '...',
                name: profiles[0].full_name,
                role: profiles[0].role
            } : null
        }

        // Test 2: Get tasks
        const { data: tasks, error: tasksError } = await supabaseAdmin
            .from('tasks')
            .select('id, title, created_at')
            .limit(5)

        console.log('[API DEBUG] Tasks query:', {
            hasData: !!tasks,
            count: tasks?.length || 0,
            error: tasksError?.message || null
        })

        results.tests.tasks = {
            success: !tasksError,
            count: tasks?.length || 0,
            error: tasksError?.message || null,
            sample: tasks?.[0] ? {
                id: tasks[0].id.substring(0, 8) + '...',
                title: tasks[0].title
            } : null
        }

        // Test 3: Get task assignments
        const { data: assignments, error: assignmentsError } = await supabaseAdmin
            .from('task_assignments')
            .select('id, user_id, task_id, status')
            .limit(5)

        console.log('[API DEBUG] Assignments query:', {
            hasData: !!assignments,
            count: assignments?.length || 0,
            error: assignmentsError?.message || null
        })

        results.tests.taskAssignments = {
            success: !assignmentsError,
            count: assignments?.length || 0,
            error: assignmentsError?.message || null,
            sample: assignments?.[0] ? {
                id: assignments[0].id.substring(0, 8) + '...',
                status: assignments[0].status
            } : null
        }

    } catch (error) {
        console.error('[API DEBUG] Exception:', error)
        results.tests.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(results)
}