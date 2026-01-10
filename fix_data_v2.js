
const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co/rest/v1';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q';

const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function fix() {
    console.log('Starting Fix via REST API...');

    // 1. Get recent completed tasks
    const tasksRes = await fetch(`${supabaseUrl}/tasks?status=eq.completed&select=id,title&order=updated_at.desc&limit=5`, { headers });
    const tasks = await tasksRes.json();

    console.log('Found recent completed tasks:', tasks.length);

    for (const task of tasks) {
        console.log(`Checking task: ${task.title} (${task.id})`);

        // Check for pending assignments
        const assignRes = await fetch(`${supabaseUrl}/task_assignments?task_id=eq.${task.id}&status=neq.completed&select=id,status,user_id`, { headers });
        const pendingAssignments = await assignRes.json();

        if (pendingAssignments && pendingAssignments.length > 0) {
            console.log(`!!! Found ${pendingAssignments.length} pending assignments. FIXING...`);

            const updateRes = await fetch(`${supabaseUrl}/task_assignments?task_id=eq.${task.id}`, {
                method: 'PATCH',
                headers: { ...headers, 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
            });

            if (updateRes.ok) {
                console.log('✅ FIXED assignments.');
            } else {
                console.error('Error updating:', await updateRes.text());
            }
        } else {
            console.log('All assignments are clean.');
        }
    }
}

fix().catch(console.error);
