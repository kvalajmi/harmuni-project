// scripts/create_staff_user.js
// Run with: node scripts/create_staff_user.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function createStaffUser() {
    console.log('Creating staff user...')

    // 1. Create user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: 'kvalajmi@gmail.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { full_name: 'Abdullah Fahd' }
    })

    if (userError) {
        if (userError.message.includes('already been registered')) {
            console.log('⚠️  User already exists, updating profile...')

            // Get existing user
            const { data: { users } } = await supabase.auth.admin.listUsers()
            const existingUser = users.find(u => u.email === 'kvalajmi@gmail.com')

            if (existingUser) {
                // Update profile
                await supabase.from('profiles').upsert({
                    id: existingUser.id,
                    full_name: 'Abdullah Fahd',
                    role: 'member'  // staff role
                })

                // Add to Courts group
                const { data: courtsGroup } = await supabase
                    .from('groups')
                    .select('id')
                    .eq('name', 'المحاكم')
                    .single()

                if (courtsGroup) {
                    await supabase.from('group_members').upsert({
                        group_id: courtsGroup.id,
                        user_id: existingUser.id
                    })
                    console.log('✅ Added to المحاكم group')
                }

                console.log('✅ Profile updated!')
                console.log('\n📧 Login credentials:')
                console.log('   Email: kvalajmi@gmail.com')
                console.log('   Password: password123')
            }
            return
        }
        console.error('❌ Error creating user:', userError.message)
        return
    }

    console.log('✅ User created:', userData.user.id)

    // 2. Update profile with staff role
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userData.user.id,
            full_name: 'Abdullah Fahd',
            role: 'member'  // Using 'member' as staff role
        })

    if (profileError) {
        console.error('❌ Error updating profile:', profileError.message)
    } else {
        console.log('✅ Profile set to staff role')
    }

    // 3. Add to Courts group
    const { data: courtsGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('name', 'المحاكم')
        .single()

    if (courtsGroup) {
        const { error: memberError } = await supabase
            .from('group_members')
            .upsert({
                group_id: courtsGroup.id,
                user_id: userData.user.id
            })

        if (!memberError) {
            console.log('✅ Added to "المحاكم" (Courts) group')
        }
    }

    console.log('\n🎉 Staff user created successfully!')
    console.log('\n📧 Login credentials:')
    console.log('   Email: kvalajmi@gmail.com')
    console.log('   Password: password123')
    console.log('   Name: Abdullah Fahd')
    console.log('   Role: Staff (member)')
    console.log('   Group: المحاكم (Courts)')
}

createStaffUser().catch(console.error)
