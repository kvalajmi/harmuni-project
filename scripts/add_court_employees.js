// scripts/add_court_employees.js
// Run with: node scripts/add_court_employees.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

// الموظفين الجدد
const employees = [
    {
        email: 'Montaseerdiab@gmail.com',
        full_name: 'منتصر عاطف محمد احمد',
        password: '123456'
    },
    {
        email: 'islllamallam@gmail.com',
        full_name: 'إسلام طارق السعيد الشحات علام',
        password: '123456'
    },
    {
        email: 'Mahmouddahy990@gmail.com',
        full_name: 'محمود ضاحي محمد حفني',
        password: '123456'
    }
]

async function createEmployee(employee) {
    console.log(`\n📝 Creating user: ${employee.full_name}...`)

    // 1. Create user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: employee.email.toLowerCase(),
        password: employee.password,
        email_confirm: true,
        user_metadata: { full_name: employee.full_name }
    })

    let userId

    if (userError) {
        if (userError.message.includes('already been registered')) {
            console.log('⚠️  User already exists, updating profile...')

            // Get existing user
            const { data: { users } } = await supabase.auth.admin.listUsers()
            const existingUser = users.find(u => u.email?.toLowerCase() === employee.email.toLowerCase())

            if (existingUser) {
                userId = existingUser.id

                // Update password
                await supabase.auth.admin.updateUserById(userId, {
                    password: employee.password
                })
                console.log('✅ Password updated')
            } else {
                console.error('❌ Could not find existing user')
                return false
            }
        } else {
            console.error('❌ Error creating user:', userError.message)
            return false
        }
    } else {
        userId = userData.user.id
        console.log('✅ User created:', userId)
    }

    // 2. Update profile with staff role
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            full_name: employee.full_name,
            role: 'member'  // Staff role
        })

    if (profileError) {
        console.error('❌ Error updating profile:', profileError.message)
    } else {
        console.log('✅ Profile set to staff role')
    }

    // 3. Add to Courts group (المحاكم)
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
                user_id: userId
            })

        if (!memberError) {
            console.log('✅ Added to "المحاكم" (Courts) group')
        } else {
            console.error('❌ Error adding to group:', memberError.message)
        }
    } else {
        console.log('⚠️  Courts group not found')
    }

    console.log(`✅ ${employee.full_name} - Ready!`)
    return true
}

async function main() {
    console.log('🚀 Adding Court Employees...')
    console.log('================================')

    let successCount = 0

    for (const employee of employees) {
        const success = await createEmployee(employee)
        if (success) successCount++
    }

    console.log('\n================================')
    console.log(`🎉 Done! ${successCount}/${employees.length} employees added successfully!`)
    console.log('\n📧 Login Credentials:')
    console.log('================================')
    for (const emp of employees) {
        console.log(`\n👤 ${emp.full_name}`)
        console.log(`   Email: ${emp.email}`)
        console.log(`   Password: ${emp.password}`)
    }
}

main().catch(console.error)
