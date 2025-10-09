# Profiles Email Column Fix - Complete Implementation

## Problem Summary
The `profiles` table was missing an `email` column, causing:
- Admin Users page showing "No users found"
- Admin Orders showing "N/A" for customers
- Order details showing "Not provided" for customer names

## Root Cause
The profiles table schema didn't include an `email` column, so:
1. Admin APIs couldn't fetch emails (they exist only in auth.users)
2. The signup process wasn't storing emails in profiles
3. Database trigger wasn't syncing emails on user creation

## Solution Implemented

### 1. Database Migration (`supabase/migrations/027_add_email_to_profiles.sql`)
✅ Adds `email` column to profiles table
✅ Creates index for performance
✅ Syncs existing emails from auth.users to profiles
✅ Updates trigger to auto-populate email on signup
✅ Includes verification queries

### 2. Updated Signup API (`app/api/auth/signup/route.ts`)
✅ Now includes `email` when inserting profile records
✅ Ensures new users have complete profile data from the start

### 3. Already Fixed (from previous work)
✅ Admin Orders API (`app/api/admin/orders/route.ts`) - fetches email from profiles
✅ Admin Users API (`app/api/admin/users/route.ts`) - queries email field
✅ Admin Orders Page (`app/admin/orders/page.tsx`) - displays customer info with fallbacks

## How to Apply the Fix

### Step 1: Run the Migration in Supabase

**Option A: Via Supabase Dashboard**
1. Go to https://app.supabase.com/project/gbymheksmnenuranuvjr/editor
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/027_add_email_to_profiles.sql`
4. Paste and run the migration
5. Check the output messages for success confirmation

**Option B: Via Supabase CLI** (if you have it installed)
```bash
supabase db push
```

### Step 2: Verify the Migration

Run this query in Supabase SQL Editor to verify:

```sql
-- Check if email column exists and has data
SELECT 
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(*) - COUNT(email) as missing_emails
FROM profiles;

-- View a sample of profiles
SELECT id, email, full_name, phone, role, created_at
FROM profiles
LIMIT 5;
```

Expected result:
- `total_profiles` should match `profiles_with_email`
- `missing_emails` should be 0

### Step 3: Test in Admin Panel

1. **Check Users Page:**
   - Go to `/admin/users`
   - You should now see all users listed
   - Each user should have their email displayed

2. **Check Orders Page:**
   - Go to `/admin/orders`  
   - Customer column should show names or emails (not "N/A")
   - Phone numbers should be visible as secondary info

3. **Check Order Details:**
   - Click "View" on any order
   - Customer Information section should show:
     - Full name (or email if name not available)
     - User ID
     - Phone number

## Files Modified

### Database:
- `supabase/migrations/027_add_email_to_profiles.sql` - NEW migration file

### API:
- `app/api/auth/signup/route.ts` - Added email field to profile creation
- `app/api/admin/orders/route.ts` - Already fetches email from profiles (previous fix)
- `app/api/admin/users/route.ts` - Already queries email field (previous fix)

### Frontend:
- `app/admin/orders/page.tsx` - Already has fallback display logic (previous fix)

## Technical Details

### Profiles Table Schema (After Migration)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,                    -- ✅ NEW COLUMN
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);  -- ✅ NEW INDEX
```

### Updated Trigger Function
The trigger now automatically populates email, full_name, and phone from auth.users metadata when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,                                        -- ✅ Syncs email
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
```

## Troubleshooting

### Issue: Migration fails with "permission denied"
**Solution:** Make sure you're running the migration with the service role key or as a superuser in Supabase dashboard.

### Issue: Some profiles still have NULL emails after migration
**Solution:** Run this manual sync query:
```sql
UPDATE profiles p
SET email = (SELECT email FROM auth.users u WHERE u.id = p.id)
WHERE p.email IS NULL;
```

### Issue: New signups don't get emails in profiles
**Solution:** 
1. Verify the trigger is active: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Re-run the trigger creation from migration 027
3. Check app logs for signup API errors

## Testing Checklist

- [ ] Migration ran successfully in Supabase
- [ ] All existing profiles have emails populated
- [ ] Admin Users page shows all users
- [ ] Admin Orders page shows customer names/emails
- [ ] Order detail pages show complete customer info
- [ ] New user signups create complete profile records
- [ ] Emails are properly indexed for fast lookups

## Status
✅ **COMPLETE** - All fixes implemented and ready for deployment

Date: October 8, 2025, 8:00 PM
