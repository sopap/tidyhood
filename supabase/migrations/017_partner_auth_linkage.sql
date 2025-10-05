-- Partner Authentication Linkage Migration
-- Adds profile_id to partners table and ensures proper authentication setup
-- Date: January 5, 2025

-- 1. Add profile_id to partners table for direct linkage
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create index for lookups
CREATE INDEX IF NOT EXISTS idx_partners_profile_id ON partners(profile_id);
CREATE INDEX IF NOT EXISTS idx_partners_contact_email ON partners(contact_email);

-- 3. Helper function to get partner by profile ID
CREATE OR REPLACE FUNCTION get_partner_by_profile(p_profile_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  name TEXT,
  service_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  active BOOLEAN,
  payout_percent NUMERIC,
  max_orders_per_slot INT,
  max_minutes_per_slot INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.service_type,
    p.contact_email,
    p.contact_phone,
    p.active,
    p.payout_percent,
    p.max_orders_per_slot,
    p.max_minutes_per_slot
  FROM partners p
  WHERE p.profile_id = p_profile_id
     OR p.contact_email = (
       SELECT au.email FROM auth.users au WHERE au.id = p_profile_id
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update existing RLS policy for partners viewing orders
-- Drop old policy if exists
DROP POLICY IF EXISTS "admin_notes_partner_select" ON admin_notes;

-- Create improved policy using profile_id
CREATE POLICY "admin_notes_partner_select" ON admin_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN partners p ON o.partner_id = p.id
      WHERE o.id = admin_notes.order_id
      AND (
        p.profile_id = auth.uid()
        OR p.contact_email IN (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
      )
    )
  );

-- 5. Create helper to check if current user is a partner
CREATE OR REPLACE FUNCTION get_current_partner_id()
RETURNS UUID AS $$
DECLARE
  partner_id UUID;
BEGIN
  SELECT p.id INTO partner_id
  FROM partners p
  WHERE p.profile_id = auth.uid()
     OR p.contact_email = (
       SELECT email FROM auth.users WHERE id = auth.uid()
     )
  LIMIT 1;
  
  RETURN partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add comment for documentation
COMMENT ON COLUMN partners.profile_id IS 'Links partner to their authentication profile for portal access';
COMMENT ON FUNCTION get_partner_by_profile IS 'Returns partner information for authenticated user';
COMMENT ON FUNCTION get_current_partner_id IS 'Returns partner ID for currently authenticated partner user';
