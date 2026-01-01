// scripts/create_admin.js
// Run with: node scripts/create_admin.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createAdminUser() {
    console.log('Creating admin user...')

    // Create user via Admin API
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
        email: 'admin@ops.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: 'Admin User'
        }
    })

    if (signUpError) {
        if (signUpError.message.includes('already been registered')) {
            console.log('User already exists, updating profile...')

            // Get existing user
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
            if (listError) {
                console.error('Error listing users:', listError)
                return
            }

            const existingUser = users.find(u => u.email === 'admin@ops.com')
            if (existingUser) {
                // Update profile to admin
                const { error: updateError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: existingUser.id,
                        full_name: 'Admin User',
                        role: 'admin'
                    })

                if (updateError) {
                    console.error('Error updating profile:', updateError)
                } else {
                    console.log('✅ Admin profile updated successfully!')
                    console.log('Email: admin@ops.com')
                    console.log('Password: password123')
                }
            }
            return
        }
        console.error('Error creating user:', signUpError)
        return
    }

    console.log('User created:', userData.user.id)

    // Set profile to admin role
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userData.user.id,
            full_name: 'Admin User',
            role: 'admin'
        })

    if (profileError) {
        console.error('Error creating profile:', profileError)
        return
    }

    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@ops.com')
    console.log('Password: password123')
}

createAdminUser()
