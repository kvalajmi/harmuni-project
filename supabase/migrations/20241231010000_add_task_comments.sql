-- Create task_comments table for discussion board
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read comments on tasks they are assigned to OR tasks they created
CREATE POLICY "Can read comments on assigned or created tasks" ON task_comments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM task_assignments WHERE task_id = task_comments.task_id
    ) OR
    auth.uid() IN (
      SELECT created_by FROM tasks WHERE id = task_comments.task_id
    )
  );

-- Policy: Users can insert comments on tasks they are assigned to OR tasks they created
CREATE POLICY "Can insert comments on assigned or created tasks" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      auth.uid() IN (
        SELECT user_id FROM task_assignments WHERE task_id = task_comments.task_id
      ) OR
      auth.uid() IN (
        SELECT created_by FROM tasks WHERE id = task_comments.task_id
      )
    )
  );

-- Also add a status column to tasks if not exists (for open/completed toggle)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN status VARCHAR(20) DEFAULT 'open';
  END IF;
END $$;
