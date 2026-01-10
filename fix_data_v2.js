
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

    // 1. Get recent completed tasks (Fix Missing Completions)
    const completedTasksRes = await fetch(`${supabaseUrl}/tasks?status=eq.completed&select=id,title&order=updated_at.desc&limit=5`, { headers });
    const completedTasks = await completedTasksRes.json();

    if (completedTasks.length > 0) {
        console.log('Checking recent COMPLETED tasks:', completedTasks.length);
        for (const task of completedTasks) {
            const assignRes = await fetch(`${supabaseUrl}/task_assignments?task_id=eq.${task.id}&status=neq.completed&select=id,status,user_id`, { headers });
            const pendingAssignments = await assignRes.json();
            if (pendingAssignments && pendingAssignments.length > 0) {
                console.log(`[Task ${task.title}] Found ${pendingAssignments.length} pending assignments. FIXING...`);
                await fetch(`${supabaseUrl}/task_assignments?task_id=eq.${task.id}`, {
                    method: 'PATCH',
                    headers: { ...headers, 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() })
                });
                console.log('✅ FIXED: Set assignments to completed.');
            }
        }
    }

    // 2. Get recent OPEN tasks (Fix Stale Completions - Reopen Issue)
    const openTasksRes = await fetch(`${supabaseUrl}/tasks?status=eq.open&select=id,title&order=updated_at.desc&limit=5`, { headers });
    const openTasks = await openTasksRes.json();

    if (openTasks.length > 0) {
        console.log('Checking recent OPEN tasks:', openTasks.length);
        for (const task of openTasks) {
            // Look for assignments that are 'completed' (should be pending/in_progress if the task is open and just re-opened)
            // Note: strictly speaking, an employee *could* complete their part while the main task is open.
            // BUT, the user's workflow implies "Re-open" should reset everyone.
            // Let's look for assignments updated *before* the task was re-opened?
            // Simpler: If task is open, and user says "it shows completed", we force reset to pending.
            const assignRes = await fetch(`${supabaseUrl}/task_assignments?task_id=eq.${task.id}&status=eq.completed&select=id,status`, { headers });
            const staleAssignments = await assignRes.json();

            if (staleAssignments && staleAssignments.length > 0) {
                console.log(`[Task ${task.title}] Found ${staleAssignments.length} STALE completed assignments. FIXING (Reset to Pending)...`);
                await fetch(`${supabaseUrl}/task_assignments?task_id=eq.${task.id}&status=eq.completed`, {
                    method: 'PATCH',
                    headers: { ...headers, 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ status: 'pending', updated_at: new Date().toISOString() })
                });
                console.log('✅ FIXED: Reset assignments to pending.');
            }
        }
    }
}

fix().catch(console.error);
