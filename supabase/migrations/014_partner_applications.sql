-- Partner Applications Migration
-- Purpose: Partner onboarding workflow and application tracking
-- Date: January 2025

CREATE TABLE partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT UNIQUE NOT NULL,
  contact_phone TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  address TEXT NOT NULL,
  zip TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  documents JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_partner_applications_status ON partner_applications(status);
CREATE INDEX idx_partner_applications_email ON partner_applications(contact_email);
CREATE INDEX idx_partner_applications_submitted ON partner_applications(submitted_at DESC);

-- Enable RLS
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "partner_applications_admin_all" ON partner_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Applicants can view their own application (if authenticated)
CREATE POLICY "partner_applications_own_select" ON partner_applications
  FOR SELECT USING (
    contact_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE partner_applications IS 'Partner onboarding applications pending admin review. Once approved, creates entry in partners table.';
COMMENT ON COLUMN partner_applications.documents IS 'JSON object with URLs to uploaded documents (COI, W9, etc.)';
COMMENT ON COLUMN partner_applications.status IS 'Application status: pending (new), under_review (admin reviewing), approved (accepted), rejected (denied)';
