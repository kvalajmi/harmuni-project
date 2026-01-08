-- Performance indexes for Harmuni Task Management
-- Run this migration in Supabase SQL Editor

-- Index for fetching user's task assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_status
ON task_assignments(user_id, status);

-- Index for fetching group members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id
ON group_members(group_id);

-- Index for fetching user's notifications (sorted by date)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Index for fetching user's circular recipients (unread first)
CREATE INDEX IF NOT EXISTS idx_circular_recipients_user_read
ON circular_recipients(user_id, is_read);

-- Index for fetching tasks by creator
CREATE INDEX IF NOT EXISTS idx_tasks_created_by
ON tasks(created_by, created_at DESC);

-- Index for fetching circulars by creator
CREATE INDEX IF NOT EXISTS idx_circulars_created_by
ON circulars(created_by, created_at DESC);
