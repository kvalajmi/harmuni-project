
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function fix() {
    console.log('Starting Fix...');

    // 1. Get the task that is "completed" but has pending assignments
    // We can look for tasks closed in the last 24 hours
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(5);

    console.log('Found recent completed tasks:', tasks?.length);

    for (const task of tasks || []) {
        console.log(`Checking task: ${task.title} (${task.id})`);

        // Check for non-completed assignments
        const { data: pendingAssignments } = await supabase
            .from('task_assignments')
            .select('id, status, user_id')
            .eq('task_id', task.id)
            .neq('status', 'completed');

        if (pendingAssignments && pendingAssignments.length > 0) {
            console.log(`!!! Found ${pendingAssignments.length} pending assignments for completed task! FIXING...`);

            const { error } = await supabase
                .from('task_assignments')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('task_id', task.id);

            if (error) console.error('Error updating:', error);
            else console.log('✅ FIXED assignments.');
        } else {
            console.log('All assignments are already completed.');
        }
    }
}

fix();
