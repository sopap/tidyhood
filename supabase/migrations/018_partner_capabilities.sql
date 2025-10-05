-- Partner Capabilities Migration
-- Purpose: Add service capabilities tracking to partners table
-- Date: October 2025

-- Add capabilities columns to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS capabilities_version INT DEFAULT 1;

-- Create index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_partners_capabilities ON partners USING GIN (capabilities);

-- Set default capabilities for existing partners (all services enabled)
-- This ensures backward compatibility - existing partners can do everything by default
UPDATE partners SET capabilities = 
  CASE 
    WHEN service_type = 'LAUNDRY' THEN '{"wash_fold": true, "dry_clean": true, "mixed": true}'::jsonb
    WHEN service_type = 'CLEANING' THEN '{"standard": true, "deep_clean": true, "move_in_out": true}'::jsonb
    ELSE '{}'::jsonb
  END
WHERE capabilities IS NULL;

-- Add helpful comments for documentation
COMMENT ON COLUMN partners.capabilities IS 'Service capabilities as JSONB. For LAUNDRY: {wash_fold, dry_clean, mixed}. For CLEANING: {standard, deep_clean, move_in_out, post_construction, commercial}. NULL treated as all services enabled for backward compatibility.';
COMMENT ON COLUMN partners.capabilities_version IS 'Schema version for capabilities structure. Allows future capability format changes while maintaining compatibility.';
