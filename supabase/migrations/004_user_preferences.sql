-- User Preferences Migration
-- Adds preferences storage and address tracking for smart defaults

-- Add preferences JSONB column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::JSONB;

-- Add last_used_at to addresses for smart sorting
ALTER TABLE addresses
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Create index for efficient address lookup
CREATE INDEX IF NOT EXISTS idx_addresses_user_last_used 
ON addresses(user_id, last_used_at DESC NULLS LAST);

-- Add comment for preferences structure documentation
COMMENT ON COLUMN profiles.preferences IS 
'User preferences stored as JSONB with structure:
{
  "last_service": "LAUNDRY" | "CLEANING",
  "last_address_id": "uuid",
  "laundry": {
    "default_weight": 15,
    "default_addons": ["LND_RUSH_24HR"],
    "detergent_preference": "eco",
    "water_temp": "cold",
    "folding_style": "standard"
  },
  "cleaning": {
    "default_bedrooms": 1,
    "default_bathrooms": 1,
    "default_deep": false,
    "default_addons": [],
    "supplies_preference": "bring",
    "pets": false,
    "shoes_off": true,
    "special_surfaces": []
  }
}';
