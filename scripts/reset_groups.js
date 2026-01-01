// scripts/reset_groups.js
// Run with: node scripts/reset_groups.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function resetGroups() {
    console.log('🔄 Resetting groups...\n')

    // 1. Delete all group memberships first (foreign key constraint)
    console.log('1. Clearing group memberships...')
    await supabase.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('   ✅ Cleared\n')

    // 2. Delete all existing groups
    console.log('2. Deleting old groups...')
    await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('   ✅ Cleared\n')

    // 3. Create new groups for law firm
    console.log('3. Creating new groups...')

    const newGroups = [
        { name: 'مناديب المحاكم' },  // Court Delegates
        { name: 'موظفين المكتب' }   // Office Staff
    ]

    for (const group of newGroups) {
        const { data, error } = await supabase
            .from('groups')
            .insert(group)
            .select()
            .single()

        if (error) {
            console.error(`   ❌ Error creating "${group.name}":`, error.message)
        } else {
            console.log(`   ✅ Created: ${data.name} (ID: ${data.id})`)
        }
    }

    console.log('\n🎉 Groups reset complete!')
    console.log('\n📋 New Structure:')
    console.log('   1. مناديب المحاكم (Court Delegates)')
    console.log('   2. موظفين المكتب (Office Staff)')
    console.log('\n💡 Roles are handled via profile.role:')
    console.log('   - admin = مدير/شريك (Full Access)')
    console.log('   - member = موظف (Restricted Access)')
}

resetGroups().catch(console.error)
