# Migration 018: Partner Capabilities - Setup Instructions

## Step 1: Run Database Migration

### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to: SQL Editor → New Query
3. Copy the contents of `supabase/migrations/018_partner_capabilities.sql`
4. Paste and click "Run"

### Migration SQL
```sql
-- Add capabilities column to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS capabilities text[] DEFAULT ARRAY['wash_fold', 'dry_clean', 'mixed']::text[];

-- Add comment
COMMENT ON COLUMN partners.capabilities IS 'Array of service capabilities: wash_fold, dry_clean, mixed';

-- Create index for faster capability queries
CREATE INDEX IF NOT EXISTS idx_partners_capabilities ON partners USING GIN (capabilities);
```

## Step 2: Update Existing Partners

Run this SQL to set capabilities for your existing partners:

### Set All Capabilities (Default - Most Partners)
```sql
-- Update all existing partners to have all capabilities
UPDATE partners 
SET capabilities = ARRAY['wash_fold', 'dry_clean', 'mixed']::text[]
WHERE capabilities IS NULL OR cardinality(capabilities) = 0;
```

### Set Specific Capabilities (Optional - If some partners are specialized)
```sql
-- Example: Partner only does wash & fold
UPDATE partners 
SET capabilities = ARRAY['wash_fold']::text[]
WHERE id = 'specific-partner-id';

-- Example: Partner does wash & fold and dry clean, but not mixed
UPDATE partners 
SET capabilities = ARRAY['wash_fold', 'dry_clean']::text[]
WHERE id = 'another-partner-id';
```

## Step 3: Verify Migration

Run this query to check the results:

```sql
-- First, let's see what columns exist
SELECT 
  id,
  capabilities,
  service_areas,
  coverage_zips,
  created_at
FROM partners
ORDER BY created_at DESC;
```

Expected output: All partners should have capabilities array populated.

**To see all columns in partners table:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners'
ORDER BY ordinal_position;
```

## Step 4: Test the API

Test the new endpoint:

```bash
# Check service availability for a specific ZIP
curl "http://localhost:3000/api/services/available?zip=10001&service_type=LAUNDRY"

# Expected response:
# {
#   "available": true,
#   "available_capabilities": ["wash_fold", "dry_clean", "mixed"],
#   "partners": [...]
# }
```

## Troubleshooting

### If capabilities column doesn't exist
The migration should handle this, but if needed:
```sql
ALTER TABLE partners ADD COLUMN capabilities text[] DEFAULT ARRAY['wash_fold', 'dry_clean', 'mixed']::text[];
```

### If index creation fails
```sql
DROP INDEX IF EXISTS idx_partners_capabilities;
CREATE INDEX idx_partners_capabilities ON partners USING GIN (capabilities);
```

### Check current state
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'partners' AND column_name = 'capabilities';
```

## What Happens Next

Once the migration is complete:
- ✅ Partners will have a `capabilities` array column
- ✅ `/api/services/available` endpoint will work properly
- ✅ Booking pages will show only available services per ZIP code
- ✅ Services unavailable in an area will be disabled with 🚫 icon

The frontend is already deployed and will start working as soon as the database is updated!
