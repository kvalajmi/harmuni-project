const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wefjsxugozhhzubdtpeb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'
);

async function resetPassword() {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error:', listError);
        return;
    }

    const user = users.find(u => u.email?.toLowerCase() === 'kvalajmi@gmail.com');
    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('Found user:', user.id);

    const newPassword = 'Admin@2026';
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
    });

    if (updateError) {
        console.error('Update error:', updateError);
    } else {
        console.log('✅ Password reset successful!');
        console.log('Email: Kvalajmi@gmail.com');
        console.log('New Password:', newPassword);
    }
}

resetPassword();
