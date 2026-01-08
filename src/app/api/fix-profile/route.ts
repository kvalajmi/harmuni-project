import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    // Get the user ID from the request body or use the default one
    const body = await request.json().catch(() => ({}))
    const userId = body.userId || 'df3a4d08-8d1f-424b-abac-b580499648df'
    const email = body.email || 'kvalajmi@gmail.com'
    const fullName = body.fullName || 'Admin'

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({
            error: 'Missing environment variables',
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!serviceKey
        }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    try {
        // Step 1: Check if profile exists
        console.log('[FIX] Checking if profile exists for user:', userId)

        const { data: existingProfile, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (existingProfile) {
            console.log('[FIX] Profile already exists:', existingProfile)
            return NextResponse.json({
                message: 'Profile already exists',
                profile: existingProfile
            })
        }

        console.log('[FIX] Profile not found, creating new profile...')

        // Step 2: Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                full_name: fullName,
                email: email,
                role: 'admin',
                is_admin: true,
                department: 'الإدارة',
                is_active: true,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (createError) {
            console.error('[FIX] Error creating profile:', createError)
            return NextResponse.json({
                error: 'Failed to create profile',
                details: createError
            }, { status: 500 })
        }

        console.log('[FIX] Profile created successfully:', newProfile)

        return NextResponse.json({
            message: 'Profile created successfully',
            profile: newProfile
        })

    } catch (error) {
        console.error('[FIX] Exception:', error)
        return NextResponse.json({
            error: 'Exception occurred',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}

// GET method to check profile status
export async function GET(request: Request) {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || 'df3a4d08-8d1f-424b-abac-b580499648df'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({
            error: 'Missing environment variables'
        }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    try {
        // Check if user exists in auth.users
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

        // Check if profile exists
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        return NextResponse.json({
            userId,
            authUser: authUser ? {
                id: authUser.id,
                email: authUser.email,
                created_at: authUser.created_at
            } : null,
            authError: authError?.message || null,
            profile: profile || null,
            profileError: profileError?.message || null,
            status: {
                hasAuthUser: !!authUser,
                hasProfile: !!profile,
                needsProfileCreation: !!authUser && !profile
            }
        })
    } catch (error) {
        return NextResponse.json({
            error: 'Exception occurred',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}