-- إنشاء جداول نظام المهام بين الموظفين
-- Employee Tasks System Tables

-- جدول المهام بين الموظفين
CREATE TABLE IF NOT EXISTS employee_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES profiles(id),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    CONSTRAINT employee_task_creator CHECK (created_by IS NOT NULL)
);

-- جدول المستقبلين للمهمة
CREATE TABLE IF NOT EXISTS employee_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(task_id, user_id)
);

-- جدول التعليقات على المهام
CREATE TABLE IF NOT EXISTS employee_task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول سجل النشاطات (للتوثيق)
CREATE TABLE IF NOT EXISTS employee_task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'viewed', 'updated_status', 'commented', 'closed', 'reopened')),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_employee_tasks_created_by ON employee_tasks(created_by);
CREATE INDEX idx_employee_tasks_created_at ON employee_tasks(created_at DESC);
CREATE INDEX idx_employee_tasks_is_closed ON employee_tasks(is_closed);
CREATE INDEX idx_employee_task_assignments_task ON employee_task_assignments(task_id);
CREATE INDEX idx_employee_task_assignments_user ON employee_task_assignments(user_id);
CREATE INDEX idx_employee_task_assignments_status ON employee_task_assignments(status);
CREATE INDEX idx_employee_task_comments_task ON employee_task_comments(task_id);
CREATE INDEX idx_employee_task_activities_task ON employee_task_activities(task_id);

-- RLS Policies
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_task_activities ENABLE ROW LEVEL SECURITY;

-- Policies for employee_tasks
-- الموظفون يقدرون يشوفون المهام اللي أنشأوها أو المعينين فيها
CREATE POLICY "Users can view their related employee tasks"
ON employee_tasks FOR SELECT
USING (
    auth.uid() = created_by
    OR auth.uid() IN (
        SELECT user_id FROM employee_task_assignments
        WHERE task_id = employee_tasks.id
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- الموظفون يقدرون ينشئون مهام
CREATE POLICY "Users can create employee tasks"
ON employee_tasks FOR INSERT
WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'member')
    )
);

-- فقط المُنشئ أو المدير يقدر يحدث المهمة
CREATE POLICY "Only creator or admin can update employee tasks"
ON employee_tasks FOR UPDATE
USING (
    auth.uid() = created_by
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for employee_task_assignments
-- الكل يقدر يشوف التعيينات للمهام اللي له علاقة فيها
CREATE POLICY "Users can view related task assignments"
ON employee_task_assignments FOR SELECT
USING (
    auth.uid() = user_id
    OR auth.uid() IN (
        SELECT created_by FROM employee_tasks
        WHERE id = employee_task_assignments.task_id
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- فقط منشئ المهمة يقدر يضيف تعيينات
CREATE POLICY "Task creator can insert assignments"
ON employee_task_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employee_tasks
        WHERE id = task_id AND created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- المستقبل يقدر يحدث حالته فقط
CREATE POLICY "Assignee can update their status"
ON employee_task_assignments FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for comments
-- الكل يقدر يشوف التعليقات على المهام اللي له علاقة فيها
CREATE POLICY "Users can view comments on related tasks"
ON employee_task_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employee_tasks t
        LEFT JOIN employee_task_assignments a ON a.task_id = t.id
        WHERE t.id = employee_task_comments.task_id
        AND (t.created_by = auth.uid() OR a.user_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- الكل يقدر يعلق على المهام اللي له علاقة فيها
CREATE POLICY "Users can comment on related tasks"
ON employee_task_comments FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND (
        EXISTS (
            SELECT 1 FROM employee_tasks t
            LEFT JOIN employee_task_assignments a ON a.task_id = t.id
            WHERE t.id = task_id
            AND (t.created_by = auth.uid() OR a.user_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Policies for activities (read-only log)
CREATE POLICY "Users can view activities for related tasks"
ON employee_task_activities FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employee_tasks t
        LEFT JOIN employee_task_assignments a ON a.task_id = t.id
        WHERE t.id = employee_task_activities.task_id
        AND (t.created_by = auth.uid() OR a.user_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- System can insert activities
CREATE POLICY "System can insert activities"
ON employee_task_activities FOR INSERT
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON employee_tasks TO authenticated;
GRANT ALL ON employee_task_assignments TO authenticated;
GRANT ALL ON employee_task_comments TO authenticated;
GRANT ALL ON employee_task_activities TO authenticated;