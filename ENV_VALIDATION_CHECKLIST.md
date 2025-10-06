# Environment Variable Validation Checklist

**Purpose:** Prevent production environment validation failures by ensuring all environment variables are set with correct formats before deployment.

**When to Use:** Before every production deployment, especially when environment variables have changed.

---

## Pre-Deployment Checklist

### Step 1: Review Required Variables

All of these **MUST** be set in Vercel with valid values:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - Format: `https://*.supabase.co`
  - Example: `https://abcdefg.supabase.co`
  - Get from: Supabase Dashboard → Settings → API

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Format: Starts with `eyJ`
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Get from: Supabase Dashboard → Settings → API

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - Format: Starts with `eyJ`
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Get from: Supabase Dashboard → Settings → API
  - ⚠️ **NEVER expose this to the client!**

- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - Format: Starts with `AIza`
  - Example: `AIzaSyD1234567890abcdefghijklmnop`
  - Get from: Google Cloud Console → APIs & Services

- [ ] `STRIPE_SECRET_KEY`
  - Format: Starts with `sk_test_` (test) or `sk_live_` (prod)
  - Example: `sk_test_51abc123...`
  - Get from: Stripe Dashboard → Developers → API Keys

- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Format: Starts with `pk_test_` (test) or `pk_live_` (prod)
  - Example: `pk_test_51abc123...`
  - Get from: Stripe Dashboard → Developers → API Keys

---

### Step 2: Review Optional Variables

These are **OPTIONAL**. If set, they must be valid. If not needed, **DELETE THEM**.

#### Stripe Webhooks (Optional)
- [ ] `STRIPE_WEBHOOK_SECRET`
  - Format: **MUST** start with `whsec_`
  - Example: `whsec_abc123...`
  - Get from: Stripe Dashboard → Developers → Webhooks
  - ⚠️ **If you don't have webhooks set up, DELETE this variable!**
  - ⚠️ **Common mistake:** Setting to `sk_test_...` (wrong format)

#### Twilio SMS (Optional)
- [ ] `TWILIO_ACCOUNT_SID`
  - Format: Starts with `AC`
  - Example: `ACabc123def456...`
  - Get from: Twilio Console

- [ ] `TWILIO_AUTH_TOKEN`
  - Format: 32+ character string
  - Example: `abc123def456...`
  - Get from: Twilio Console

- [ ] `TWILIO_FROM_PHONE`
  - Format: **MUST** be E.164 format: `+1XXXXXXXXXX`
  - Example: `+12125551234`
  - Get from: Twilio Console → Phone Numbers
  - ⚠️ **Must include country code (+1 for US)**

#### Admin Configuration (Optional)
- [ ] `ADMIN_EMAIL`
  - Format: Valid email address
  - Example: `admin@tidyhood.com`
  - Used for: System notifications

- [ ] `SEED_ADMIN_EMAIL`
  - Format: Valid email address
  - Example: `admin@tidyhood.com`
  - Used for: Bootstrap first admin user

- [ ] `NEXT_PUBLIC_BASE_URL`
  - Format: Valid URL
  - Example: `https://www.tidyhood.nyc`
  - Usually same as NEXT_PUBLIC_SITE_URL

---

### Step 3: Review Variables with Defaults

These have defaults in code. Only set them if you need different values:

- [ ] `NEXT_PUBLIC_SITE_NAME`
  - Default: `Tidyhood`
  - Only set if you need to override

- [ ] `NEXT_PUBLIC_SITE_URL`
  - Default: `https://www.tidyhood.nyc`
  - Set to your production domain

- [ ] `NEXT_PUBLIC_ALLOWED_ZIPS`
  - Default: `10026,10027,10030`
  - Comma-separated list of ZIP codes where service is available
  - Example: `10026,10027,10030,10031,10032`

- [ ] `NYC_TAX_RATE`
  - Default: `0.08875`
  - Format: **MUST** be decimal (not percentage)
  - ⚠️ **Wrong:** `8.875` or `8.875%`
  - ✅ **Right:** `0.08875`

- [ ] `FIRST_ORDER_CAP_CENTS`
  - Default: `7500` ($75.00)
  - Format: **MUST** be integer in cents
  - ⚠️ **Wrong:** `75.00` or `$75`
  - ✅ **Right:** `7500` (represents $75.00)

- [ ] `LAUNDRY_MIN_LBS`
  - Default: `10`
  - Format: **MUST** be integer (whole number)
  - ⚠️ **Wrong:** `10.5` or `10 lbs`
  - ✅ **Right:** `10`

---

### Step 4: Feature Flags (Optional)

All feature flags default to `false`. Only set to `true` if you want to enable:

- [ ] `NEXT_PUBLIC_ENABLE_PARTNER_PORTAL`
- [ ] `NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR`
- [ ] `NEXT_PUBLIC_ENABLE_AUTO_ASSIGN`
- [ ] `NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS`
- [ ] `NEXT_PUBLIC_UNIFIED_ORDER_UI`
- [ ] `NEXT_PUBLIC_UNIFIED_TIMELINE`
- [ ] `NEXT_PUBLIC_ENHANCED_ANIMATIONS`
- [ ] `NEXT_PUBLIC_ANALYTICS`

---

### Step 5: Local Validation (Before Deploy)

Test locally with production-like environment:

```bash
# 1. Create test environment file
cp .env.example .env.production.test

# 2. Fill with VALID values (use correct formats!)
# - Use real formats but test values
# - Delete optional vars if not using them

# 3. Test build
npm run build

# 4. Check for errors
# ✅ Should see: "✓ Compiled successfully"
# ❌ Should NOT see: "Environment validation failed"
```

If you see validation errors:
1. Read the error message carefully
2. It will tell you which variable and why it failed
3. Fix the format or delete the variable
4. Try again

---

### Step 6: Vercel Dashboard Check

Before clicking "Redeploy":

1. **Go to:** Project Settings → Environment Variables
2. **Verify:** All required variables are set
3. **Check:** Optional variables have correct formats OR are deleted
4. **Confirm:** No variables with invalid formats
5. **Review:** Recent changes to environment variables

**Common Mistakes:**
- ❌ `STRIPE_WEBHOOK_SECRET` set to `sk_test_...` (should be `whsec_...` or deleted)
- ❌ `TWILIO_FROM_PHONE` missing `+1` country code
- ❌ `NYC_TAX_RATE` set to `8.875` instead of `0.08875`
- ❌ `FIRST_ORDER_CAP_CENTS` set to `$75` instead of `7500`

---

### Step 7: Deploy Safely

#### If Environment Variables Changed:
```bash
# 1. Clear build cache first
# Vercel Dashboard → Settings → General → Clear Build Cache

# 2. Then redeploy
# Deployments → Latest → ... → Redeploy
# ✅ Uncheck "Use existing Build Cache"
```

#### If No Environment Changes:
```bash
# Regular deploy
git push origin main
# OR
# Deployments → Latest → ... → Redeploy
```

---

### Step 8: Post-Deployment Verification

Within 5 minutes of deployment:

- [ ] Visit production site: `https://www.tidyhood.nyc`
- [ ] Test critical endpoints:
  - [ ] `GET /api/orders` → Should return 200 OK
  - [ ] `GET /api/recurring/plan` → Should return 200 OK
- [ ] Check Vercel logs for errors
  - Deployments → Latest → View Function Logs
  - ❌ If you see "Environment validation failed" → Investigate immediately
- [ ] Test user-facing features:
  - [ ] Login works
  - [ ] Orders page loads
  - [ ] No 500 errors in browser console

---

## Quick Reference: Format Requirements

| Variable | Must Start With | Example | Can Be Empty? |
|----------|----------------|---------|---------------|
| `STRIPE_WEBHOOK_SECRET` | `whsec_` | `whsec_abc123...` | Yes (optional) |
| `STRIPE_SECRET_KEY` | `sk_` | `sk_test_abc123...` | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_` | `pk_test_abc123...` | No |
| `TWILIO_ACCOUNT_SID` | `AC` | `ACabc123...` | Yes (optional) |
| `TWILIO_FROM_PHONE` | `+1` | `+12125551234` | Yes (optional) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://` | `https://abc.supabase.co` | No |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `AIza` | `AIzaSy...` | No |
| `NYC_TAX_RATE` | `0.` | `0.08875` | Has default |
| `FIRST_ORDER_CAP_CENTS` | (integer) | `7500` | Has default |
| `LAUNDRY_MIN_LBS` | (integer) | `10` | Has default |

---

## Troubleshooting

### "Environment validation failed" Error

1. **Check Vercel Logs:**
   ```
   Deployments → Latest → View Function Logs
   ```

2. **Look for:** Detailed error message showing which variable failed
   ```
   - STRIPE_WEBHOOK_SECRET: Invalid input: must start with "whsec_"
   ```

3. **Fix Options:**
   - **Option A:** Delete the variable (if optional and not using it)
   - **Option B:** Fix the value to match the required format
   - **Option C:** Set it in Vercel if it's missing

4. **Redeploy:**
   - Clear build cache
   - Redeploy without cache

### Build Cache Issues

**Symptom:** Deployed code but errors persist

**Solution:**
1. Vercel Dashboard → Settings → General
2. Scroll to "Build & Development Settings"
3. Click "Clear Build Cache"
4. Redeploy

### Variables Not Taking Effect

**Symptom:** Changed variable but app still uses old value

**Causes:**
1. Build cache not cleared
2. Variable set to wrong environment (preview vs production)
3. Typo in variable name

**Solution:**
1. Verify variable name is exact (case-sensitive)
2. Check it's set for "Production" environment
3. Clear cache and redeploy

---

## Emergency Rollback

If deployment fails and you can't fix quickly:

1. **Go to:** Deployments tab
2. **Find:** Last working deployment (before the env changes)
3. **Click:** "..." menu → "Promote to Production"
4. **Fix:** Environment variables offline
5. **Redeploy:** When ready

**Recovery Time:** < 2 minutes

---

## Best Practices

### ✅ DO:
- Test builds locally before deploying
- Use correct formats for all variables
- Delete optional variables if not using them
- Clear cache when env variables change
- Document why each variable exists
- Use staging environment for testing
- Review this checklist before every deploy

### ❌ DON'T:
- Assume optional variables can have any value
- Deploy without testing locally first
- Ignore validation errors
- Use wrong formats (e.g., `sk_` for webhook secret)
- Set variables you don't need
- Skip cache clearing after env changes
- Deploy straight to production without testing

---

## Related Documents

- [POST_MORTEM_ENV_VALIDATION_OCT6_2025.md](./POST_MORTEM_ENV_VALIDATION_OCT6_2025.md) - Detailed incident analysis
- [DEPLOYMENT_GUIDE_PRODUCTION.md](./DEPLOYMENT_GUIDE_PRODUCTION.md) - Full deployment procedures
- [.env.example](./.env.example) - Template with all variables and comments

---

## Version History

| Date | Changes | Author |
|------|---------|--------|
| Oct 6, 2025 | Initial version after production incident | Dev Team |

---

**Last Updated:** October 6, 2025  
**Next Review:** October 13, 2025

---

*Questions? See the post-mortem document or ask in #engineering*
