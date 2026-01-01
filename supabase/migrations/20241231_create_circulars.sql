-- =============================================
-- Circulars (التعاميم) Tables
-- =============================================

-- Main circulars table
CREATE TABLE IF NOT EXISTS circulars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    attachment_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circular recipients table (tracks who received and read)
CREATE TABLE IF NOT EXISTS circular_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circular_id UUID REFERENCES circulars(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circular_id, user_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_circulars_created_by ON circulars(created_by);
CREATE INDEX IF NOT EXISTS idx_circulars_created_at ON circulars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circular_recipients_circular_id ON circular_recipients(circular_id);
CREATE INDEX IF NOT EXISTS idx_circular_recipients_user_id ON circular_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_circular_recipients_is_read ON circular_recipients(is_read);

-- Enable RLS (but we'll use service role key to bypass)
ALTER TABLE circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE circular_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies (optional - we bypass with service role)
-- Users can view circulars they're recipients of
CREATE POLICY "Users can view their circulars" ON circulars
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM circular_recipients
            WHERE circular_recipients.circular_id = circulars.id
            AND circular_recipients.user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- Users can view their recipient records
CREATE POLICY "Users can view their recipient records" ON circular_recipients
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own read status
CREATE POLICY "Users can mark as read" ON circular_recipients
    FOR UPDATE USING (user_id = auth.uid());
