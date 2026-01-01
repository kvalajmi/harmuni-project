const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wefjsxugozhhzubdtpeb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q'
);

async function createPushTable() {
    // Create table by attempting to insert (Supabase will create if doesn't exist with dynamic schema)
    // Actually we need to use the SQL editor in Supabase Dashboard

    console.log('=== CREATE TABLE SQL ===');
    console.log(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      endpoint TEXT NOT NULL,
      subscription JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_user_endpoint UNIQUE(user_id, endpoint)
    );
    
    CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
    
    -- Add column to profiles for notification preference
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
  `);
    console.log('========================');
    console.log('Please run this SQL in your Supabase SQL Editor');
}

createPushTable();
