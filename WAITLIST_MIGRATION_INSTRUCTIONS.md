# Waitlist Migration Instructions

## ⚠️ The waitlist table needs to be created in your database

The `/waitlist` page is getting a 500 error because the `waitlist` table doesn't exist yet.

## 🚀 Quick Fix (2 minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration SQL
1. Click **New Query**
2. Copy the SQL below and paste it into the editor
3. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

```sql
-- Create waitlist table for tracking expansion interest
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  service_interest TEXT NOT NULL CHECK (service_interest IN ('laundry', 'cleaning', 'both')),
  message TEXT,
  device_type TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate entries
  UNIQUE(email, zip_code)
);

-- Index for querying by ZIP code (for expansion planning)
CREATE INDEX idx_waitlist_zip ON waitlist(zip_code);

-- Index for querying by service interest
CREATE INDEX idx_waitlist_service ON waitlist(service_interest);

-- Index for sorting by date
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at DESC);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public form submission)
CREATE POLICY "Anyone can submit to waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only admins can view waitlist
CREATE POLICY "Only admins can view waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE waitlist IS 'Stores waitlist signups for service area expansion';
```

### Step 3: Verify
1. Go to **Table Editor** in left sidebar
2. You should now see a new `waitlist` table
3. Test the form at http://localhost:3005/waitlist

## ✅ Success!

Once the migration is complete:
- The waitlist form will work
- You can view submissions in Supabase Dashboard → waitlist table
- Analytics data (device type, referrer) will be tracked automatically

## 📝 Alternative: Copy from Migration File

The SQL above is also available in:
```
supabase/migrations/012_waitlist_table.sql
```

You can open that file and copy the entire contents to run in SQL Editor.
