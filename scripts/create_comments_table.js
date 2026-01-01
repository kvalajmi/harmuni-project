// scripts/create_comments_table.js
// Run with: node scripts/create_comments_table.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wefjsxugozhhzubdtpeb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function createCommentsTable() {
    console.log('Creating task_comments table...\n')

    // Create the table via raw SQL
    const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
      -- Create task_comments table
      CREATE TABLE IF NOT EXISTS task_comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create index for faster queries
      CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

      -- Enable RLS
      ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

      -- Policy: Users can read comments on tasks they are assigned to OR tasks they created
      DROP POLICY IF EXISTS "Can read comments on assigned or created tasks" ON task_comments;
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
      DROP POLICY IF EXISTS "Can insert comments on assigned or created tasks" ON task_comments;
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
    `
    })

    if (createError) {
        // Try alternative: direct SQL execution might not be available
        // Let's just insert a test to see if table exists, if not create manually
        console.log('Note: RPC not available, checking if table exists...')

        const { error: checkError } = await supabase
            .from('task_comments')
            .select('id')
            .limit(1)

        if (checkError && checkError.code === '42P01') {
            console.log('⚠️  Table does not exist. Please run the following SQL in Supabase SQL Editor:\n')
            console.log(`
-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read comments on tasks they are assigned to OR created
CREATE POLICY "Can read comments on assigned or created tasks" ON task_comments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM task_assignments WHERE task_id = task_comments.task_id
    ) OR
    auth.uid() IN (
      SELECT created_by FROM tasks WHERE id = task_comments.task_id
    )
  );

-- Policy: Users can insert comments on tasks they are assigned to OR created
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
      `)
        } else if (!checkError) {
            console.log('✅ task_comments table already exists!')
        } else {
            console.log('Table check result:', checkError)
        }
    } else {
        console.log('✅ task_comments table created successfully!')
    }
}

createCommentsTable().catch(console.error)
