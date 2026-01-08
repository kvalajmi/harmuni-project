import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    // Test specific user ID
    const userId = 'df3a4d08-8d1f-424b-abac-b580499648df'

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    const results = {
        userId,
        environment: {
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            hasServiceKey: !!serviceKey,
            urlStart: supabaseUrl?.substring(0, 30) + '...'
        },
        tests: {
            withAnonKey: null,
            withServiceKey: null,
            directQuery: null,
            allProfiles: null
        }
    }

    if (!supabaseUrl) {
        results.tests.withAnonKey = { error: 'Missing SUPABASE_URL' }
        return NextResponse.json(results)
    }

    // Test 1: Query with anon key (simulating client-side)
    if (supabaseAnonKey) {
        try {
            console.log('[API DEBUG] Testing with anon key...')
            const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

            const { data, error, status } = await supabaseAnon
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            results.tests.withAnonKey = {
                success: !error,
                hasData: !!data,
                error: error ? {
                    message: error.message,
                    code: error.code,
                    hint: error.hint,
                    details: error.details
                } : null,
                status,
                profile: data ? {
                    id: data.id,
                    full_name: data.full_name,
                    role: data.role,
                    is_active: data.is_active
                } : null
            }
        } catch (e) {
            results.tests.withAnonKey = {
                error: 'Exception: ' + (e instanceof Error ? e.message : String(e))
            }
        }
    }

    // Test 2: Query with service key (admin access)
    if (serviceKey) {
        try {
            console.log('[API DEBUG] Testing with service key...')
            const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            })

            const { data, error, status } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            results.tests.withServiceKey = {
                success: !error,
                hasData: !!data,
                error: error ? {
                    message: error.message,
                    code: error.code,
                    hint: error.hint,
                    details: error.details
                } : null,
                status,
                profile: data ? {
                    id: data.id,
                    full_name: data.full_name,
                    role: data.role,
                    is_active: data.is_active
                } : null
            }
        } catch (e) {
            results.tests.withServiceKey = {
                error: 'Exception: ' + (e instanceof Error ? e.message : String(e))
            }
        }
    }

    // Test 3: Direct query without any filters (with service key)
    if (serviceKey) {
        try {
            console.log('[API DEBUG] Testing direct query with service key...')
            const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            })

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, role')
                .limit(5)

            results.tests.directQuery = {
                success: !error,
                count: data?.length || 0,
                error: error?.message || null,
                profiles: data?.map(p => ({
                    id: p.id.substring(0, 8) + '...',
                    full_name: p.full_name,
                    role: p.role
                }))
            }
        } catch (e) {
            results.tests.directQuery = {
                error: 'Exception: ' + (e instanceof Error ? e.message : String(e))
            }
        }
    }

    // Test 4: Check if the specific user exists in profiles
    if (serviceKey) {
        try {
            console.log('[API DEBUG] Checking if user exists in profiles...')
            const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            })

            // Get all profiles to see what's there
            const { data: allProfiles, error: allError } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, role, created_at')
                .order('created_at', { ascending: false })

            // Look for our specific user
            const ourUser = allProfiles?.find(p => p.id === userId)

            results.tests.allProfiles = {
                success: !allError,
                totalCount: allProfiles?.length || 0,
                error: allError?.message || null,
                userFound: !!ourUser,
                userProfile: ourUser || null,
                recentProfiles: allProfiles?.slice(0, 3).map(p => ({
                    id: p.id,
                    full_name: p.full_name,
                    role: p.role,
                    created_at: p.created_at
                }))
            }
        } catch (e) {
            results.tests.allProfiles = {
                error: 'Exception: ' + (e instanceof Error ? e.message : String(e))
            }
        }
    }

    return NextResponse.json(results, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    })
}