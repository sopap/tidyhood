-- Add missing check_capacity_conflict function
-- This function should have been created in migration 016 but may be missing

CREATE OR REPLACE FUNCTION check_capacity_conflict(
  p_partner_id UUID,
  p_slot_start TIMESTAMPTZ,
  p_slot_end TIMESTAMPTZ,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM capacity_calendar
    WHERE partner_id = p_partner_id
    AND id != COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (slot_start <= p_slot_start AND slot_end > p_slot_start) OR
      (slot_start < p_slot_end AND slot_end >= p_slot_end) OR
      (slot_start >= p_slot_start AND slot_end <= p_slot_end)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_capacity_conflict IS 'Returns true if there is a time overlap for the given partner';
