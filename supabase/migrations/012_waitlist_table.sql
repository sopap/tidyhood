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
