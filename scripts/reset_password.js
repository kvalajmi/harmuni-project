const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wefjsxugozhhzubdtpeb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'
);

async function resetPassword() {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email?.toLowerCase() === 'kvalajmi@gmail.com');
    if (!user) { console.log('User not found'); return; }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: '6666703866'
    });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Password updated successfully');
        console.log('Email: kvalajmi@gmail.com');
        console.log('Password: 6666703866');
    }
}

resetPassword();
