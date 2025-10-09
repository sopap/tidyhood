-- Add email column to profiles table and sync existing data
-- This fixes the issue where admin panel can't display user information

-- Step 1: Add email column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Step 3: Sync emails from auth.users to profiles for existing users
-- This uses the service role to access auth.users
UPDATE profiles p
SET email = (
  SELECT email 
  FROM auth.users u 
  WHERE u.id = p.id
)
WHERE p.email IS NULL;

-- Step 4: Update the trigger to include email when creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user',
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    phone = COALESCE(NULLIF(profiles.phone, ''), EXCLUDED.phone),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Verify the migration
DO $$
DECLARE
  missing_email_count INTEGER;
  total_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles;
  SELECT COUNT(*) INTO missing_email_count FROM profiles WHERE email IS NULL OR email = '';
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '- Total profiles: %', total_profiles;
  RAISE NOTICE '- Profiles missing email: %', missing_email_count;
  
  IF missing_email_count > 0 THEN
    RAISE WARNING 'Some profiles still have missing emails. They may need manual fixing.';
  ELSE
    RAISE NOTICE 'SUCCESS: All profiles now have emails!';
  END IF;
END $$;
