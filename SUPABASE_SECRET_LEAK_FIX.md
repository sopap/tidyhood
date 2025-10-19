# Supabase Secret Leak Security Fix

**Date:** October 19, 2025  
**Severity:** CRITICAL  
**Status:** LOCAL ENVIRONMENT SECURED ✅ | Production Deployment Pending

## Issue Summary

GitHub detected a publicly leaked Supabase Service Role Key in the `jest.setup.js` file. This key was hardcoded directly in the test setup file and committed to the repository.

### Leaked Credentials
- **File:** `jest.setup.js`
- **Supabase URL:** `https://gbymheksmnenuranuvjr.supabase.co`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (✅ REVOKED)
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (✅ REVOKED)
- **New Keys Format:** Using `sb_publishable_...` and `sb_secret_...` format (Supabase API v2)

## Immediate Actions Taken

### 1. Remove Hardcoded Secrets ✅
Updated `jest.setup.js` to use environment variables instead of hardcoded values:

```javascript
// Before (INSECURE):
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://gbymheksmnenuranuvjr.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGci...';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGci...';

// After (SECURE):
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
}
```

### 2. Update Documentation ✅
- Updated `.env.example` with test environment section
- Documented how to properly set up test credentials
- Added warnings about never committing real credentials

### 3. Verify Git Protection ✅
Confirmed `.gitignore` includes `.env*.local` pattern, which protects:
- `.env.local`
- `.env.test.local`
- `.env.development.local`
- `.env.production.local`

## Required Next Steps (CRITICAL)

### 1. Revoke Exposed Credentials ⚠️ URGENT
**You must immediately revoke the exposed Supabase keys:**

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project (`gbymheksmnenuranuvjr`)
3. Navigate to Settings → API
4. Under "Service Role Key", click "Reset"
5. Under "Anon Key", click "Reset" (recommended)
6. Copy the new keys

### 2. Update Production Environment
After revoking keys, update them in:
- Your local `.env.local` file
- Vercel environment variables (Settings → Environment Variables)
- Any CI/CD pipeline secrets
- Team member's local environments

### 3. Create Test Environment File
Create `.env.test.local` for local test runs:

```bash
# .env.test.local (NOT committed to git)
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
NYC_TAX_RATE=0.08875
```

**Best Practice:** Use a separate Supabase project for testing to avoid affecting production data.

### 4. Check Security Logs
1. Go to Supabase Dashboard → Logs
2. Review API logs for any suspicious activity
3. Check for unauthorized access between October 19, 2025 1:26 AM and 1:35 AM
4. Document any unusual patterns

### 5. Close GitHub Alert
After completing all remediation steps:
1. Go to GitHub Security tab
2. Find the "Supabase Service Key" alert
3. Mark as "Revoked" with a comment explaining the remediation

## Running Tests Going Forward

### Local Development
1. Create `.env.test.local` with test credentials
2. Run tests: `npm test`

### CI/CD Pipeline
Set environment variables in your CI/CD platform:
```bash
NEXT_PUBLIC_SUPABASE_URL=<test-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<test-service-role-key>
NYC_TAX_RATE=0.08875
```

## Prevention Measures

### Code Review Checklist
- [ ] Never hardcode credentials in any file
- [ ] Use environment variables for all secrets
- [ ] Check `.gitignore` before committing
- [ ] Run `git diff` to review changes
- [ ] Use pre-commit hooks to scan for secrets

### Recommended Tools
- **git-secrets**: Prevent committing secrets
- **truffleHog**: Scan repository history for secrets
- **GitHub Secret Scanning**: Enable for repository

### Team Education
1. Share this document with all team members
2. Review secure coding practices
3. Emphasize importance of environment variables
4. Document secret rotation procedures

## Lessons Learned

1. **Test setup files are NOT the place for real credentials**
   - Use mock/dummy values as defaults
   - Load real values from environment variables

2. **Multiple layers of protection needed**
   - `.gitignore` (local)
   - `.env.example` (documentation)
   - Pre-commit hooks (automation)
   - Code review (human check)

3. **Rotate regularly**
   - Even without a leak, rotate secrets quarterly
   - Use different keys for different environments
   - Never share production keys with development

## Timeline

- **1:26 AM** - GitHub detected secret in jest.setup.js
- **1:33 AM** - Removed hardcoded secrets from jest.setup.js
- **1:34 AM** - Updated .env.example documentation
- **1:35 AM** - Verified .gitignore protection
- **8:24 AM** - ✅ Revoked exposed Supabase keys and generated new ones
- **8:25 AM** - ✅ Verified new keys work correctly via connection test
- **PENDING** - Update production environment variables (Vercel)
- **PENDING** - Close GitHub security alert

## Contact

For questions about this security incident:
- Review this document
- Check `.env.example` for setup instructions
- Consult team security lead

---

**Remember:** This is a critical security fix. Do not skip any of the required next steps.
