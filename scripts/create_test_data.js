// scripts/create_test_data.js
// Run with: node scripts/create_test_data.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function createTestData() {
    console.log('Creating test data...')

    // 1. Create groups
    const groups = [
        { name: 'المحاكم' },  // Courts
        { name: 'الإدارة' },  // Administration
        { name: 'الدعم الفني' }  // Technical Support
    ]

    console.log('\n📁 Creating groups...')
    for (const group of groups) {
        const { data, error } = await supabase
            .from('groups')
            .insert(group)
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                console.log(`   ⚠️  Group "${group.name}" already exists`)
            } else {
                console.error(`   ❌ Error creating group "${group.name}":`, error.message)
            }
        } else {
            console.log(`   ✅ Created group: ${data.name} (ID: ${data.id})`)
        }
    }

    // 2. Get admin user
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .single()

    if (adminProfile) {
        // 3. Add admin to Courts group
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
                    user_id: adminProfile.id
                })

            if (!memberError) {
                console.log('\n👥 Added admin to "المحاكم" group')
            }
        }
    }

    // 4. Create a couple of test users
    console.log('\n👤 Creating test users...')

    const testUsers = [
        { email: 'user1@ops.com', password: 'password123', full_name: 'محمد أحمد' },
        { email: 'user2@ops.com', password: 'password123', full_name: 'فاطمة علي' }
    ]

    for (const user of testUsers) {
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { full_name: user.full_name }
        })

        if (error) {
            if (error.message.includes('already been registered')) {
                console.log(`   ⚠️  User "${user.email}" already exists`)
            } else {
                console.error(`   ❌ Error creating user "${user.email}":`, error.message)
            }
        } else {
            console.log(`   ✅ Created user: ${user.email}`)

            // Add to Courts group
            const { data: courtsGroup } = await supabase
                .from('groups')
                .select('id')
                .eq('name', 'المحاكم')
                .single()

            if (courtsGroup) {
                await supabase.from('group_members').upsert({
                    group_id: courtsGroup.id,
                    user_id: data.user.id
                })
            }
        }
    }

    console.log('\n✅ Test data created successfully!')
    console.log('\n📊 Summary:')
    console.log('   - 3 Groups: المحاكم، الإدارة، الدعم الفني')
    console.log('   - 2 Test users added to "المحاكم" group')
    console.log('\nYou can now test task dispatching to the "المحاكم" group!')
}

createTestData().catch(console.error)
