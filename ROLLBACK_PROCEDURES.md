# 🔄 Rollback Procedures

## Emergency Rollback Guide

**Purpose:** Step-by-step procedures for rolling back deployments when issues occur in production.

**When to rollback:**
- Critical bugs affecting core functionality
- Data integrity issues
- Security vulnerabilities introduced
- Performance degradation >50%
- Payment processing failures
- Error rate >5%

---

## 🚨 Quick Rollback Checklist

1. **Identify the problem** - Check logs, Sentry, metrics
2. **Assess severity** - Is it critical? Can we fix forward?
3. **Notify team** - Alert on-call, stakeholders
4. **Execute rollback** - Follow procedures below
5. **Verify rollback** - Test critical flows
6. **Document incident** - Post-mortem within 24h

---

## 📦 Deployment Rollback

### Vercel/Netlify Deployment

**Option A: Via Dashboard (Fastest - 2 minutes)**
1. Go to Vercel/Netlify Dashboard → Deployments
2. Find the last stable deployment (before the issue)
3. Click "..." → "Promote to Production"
4. Verify deployment completes successfully
5. Test critical paths (login, order creation, payment)

**Option B: Via CLI**
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel promote <deployment-url>

# OR for Netlify
netlify rollback
```

**Option C: Git Revert + Redeploy**
```bash
# Find the commit that introduced the issue
git log --oneline -n 10

# Revert the problematic commit
git revert <commit-hash>

# Push to trigger deployment
git push origin main
```

---

## 🗄️ Database Rollback

### Supabase Migrations

**⚠️ CRITICAL: Test rollbacks on staging first!**

### Scenario 1: Rollback Last Migration

```bash
# Check current migration
npx supabase migration list

# Rollback one migration
npx supabase migration down

# Verify database state
psql $DATABASE_URL -c "\dt"
```

### Scenario 2: Rollback to Specific Migration

```bash
# Rollback to a specific migration number
npx supabase migration repair <migration-number>

# Example: Rollback to migration 020
npx supabase migration repair 020
```

### Scenario 3: Manual SQL Rollback

If you need to manually rollback a migration:

```sql
-- 1. Connect to database
psql $DATABASE_URL

-- 2. Start transaction
BEGIN;

-- 3. Execute rollback SQL (example: undo migration 021)
DROP TABLE IF EXISTS webhook_events;
DROP FUNCTION IF EXISTS cleanup_old_webhook_events();

-- 4. Update migration tracking
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '021';

-- 5. Verify changes
\dt

-- 6. Commit if successful, rollback if not
COMMIT;
-- OR
ROLLBACK;
```

### Common Migration Rollback SQL

**Undo Table Creation:**
```sql
DROP TABLE IF EXISTS table_name CASCADE;
```

**Undo Column Addition:**
```sql
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;
```

**Undo Index Creation:**
```sql
DROP INDEX IF EXISTS index_name;
```

**Undo RLS Policy:**
```sql
DROP POLICY IF EXISTS policy_name ON table_name;
```

**Undo Function:**
```sql
DROP FUNCTION IF EXISTS function_name();
```

---

## 🔧 Configuration Rollback

### Environment Variables

**Problem:** Bad environment variable deployed

**Solution:**
1. Go to hosting platform (Vercel, Netlify, etc.)
2. Navigate to Settings → Environment Variables
3. Find the problematic variable
4. Revert to previous value
5. Trigger redeployment

**Backup Location:**
- Keep a copy of production `.env` in secure password manager
- Document changes in `CHANGELOG.md`

### Feature Flags

**Problem:** Feature flag causing issues

**Solution:**
```typescript
// In .env.local or hosting platform
NEXT_PUBLIC_UNIFIED_ORDER_UI=false
NEXT_PUBLIC_ENABLE_NEW_FEATURE=false
```

Redeploy to apply changes.

---

## 📝 Dependency Rollback

### Rollback npm Package Updates

**Problem:** Updated package causing issues

**Solution:**

```bash
# Check what changed
git diff HEAD~1 package.json

# Revert package.json and package-lock.json
git checkout HEAD~1 -- package.json package-lock.json

# Reinstall old versions
npm install

# Commit and redeploy
git add package.json package-lock.json
git commit -m "Rollback dependency updates"
git push origin main
```

**Specific Package Rollback:**
```bash
# Install specific old version
npm install next@14.1.0

# Commit
git add package.json package-lock.json
git commit -m "Rollback Next.js to 14.1.0"
git push origin main
```

---

## 🔐 Security Incident Rollback

### Compromised Secrets

**Immediate Actions:**

1. **Rotate all secrets immediately:**
```bash
# Generate new secrets
STRIPE_SECRET_KEY=sk_live_NEW_KEY
STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET
SUPABASE_SERVICE_ROLE_KEY=NEW_KEY
```

2. **Update in all environments:**
   - Production hosting platform
   - Staging environment
   - Local development (team)

3. **Revoke old secrets:**
   - Stripe Dashboard → API Keys → Revoke old key
   - Supabase Dashboard → Settings → API → Regenerate
   - Twilio → Revoke old auth token

4. **Force redeployment:**
```bash
# Trigger redeploy with new secrets
git commit --allow-empty -m "Force redeploy with new secrets"
git push origin main
```

### Compromised Database

1. **Isolate the database** - Restrict network access
2. **Create backup** - Immediate snapshot
3. **Assess damage** - Query audit logs
4. **Restore from clean backup:**

```bash
# List available backups
supabase db backup list

# Restore from backup
supabase db backup restore <backup-id>
```

---

## 🧪 Testing After Rollback

### Critical Path Tests

**Run these tests after any rollback:**

1. **Authentication**
   - [ ] User can log in
   - [ ] User can sign up
   - [ ] JWT tokens work

2. **Booking Flow**
   - [ ] Can view available slots
   - [ ] Can create laundry order
   - [ ] Can create cleaning order

3. **Payments**
   - [ ] Stripe checkout works
   - [ ] Webhooks are received
   - [ ] Orders marked as paid

4. **Partner Portal**
   - [ ] Partners can log in
   - [ ] Can view assigned orders
   - [ ] Can update order status

5. **Admin Panel**
   - [ ] Admins can log in
   - [ ] Can view all orders
   - [ ] Can manage partners

### Smoke Test Script

```bash
#!/bin/bash
# Save as: scripts/smoke-test.sh

echo "Running smoke tests..."

# Test health endpoint
curl -f https://yourdomain.com/api/health || exit 1

# Test authentication
curl -f https://yourdomain.com/api/auth/login -X POST || exit 1

# Test order creation (with test token)
curl -f https://yourdomain.com/api/orders -X POST \
  -H "Authorization: Bearer $TEST_TOKEN" || exit 1

echo "✅ All smoke tests passed"
```

---

## 📊 Monitoring After Rollback

### Key Metrics to Watch

Monitor for 30 minutes after rollback:

- **Error Rate** - Should drop to <0.1%
- **Response Time** - P95 <500ms
- **Order Creation Rate** - Back to normal
- **Payment Success Rate** - >98%
- **User Login Success** - >99%

### Sentry

Check Sentry dashboard for:
- New error count (should drop)
- Error patterns (should normalize)
- Release comparison (before vs after rollback)

### Database

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, state, wait_event_type, wait_event 
FROM pg_stat_activity 
WHERE state != 'idle' 
AND query_start < now() - interval '5 seconds';

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📞 Communication Protocol

### During Incident

**Who to notify:**
1. Engineering team (Slack #incidents)
2. On-call engineer
3. Product owner
4. Customer success (if user-facing)

**Message Template:**
```
🚨 INCIDENT: [Brief Description]
Severity: [Critical/High/Medium]
Impact: [What's affected]
Status: Investigating / Rolling back / Resolved
ETA: [Time estimate]
Updates: Will post every 15 minutes
```

### Post-Incident

**Within 24 hours:**
1. Write post-mortem
2. Schedule team debrief
3. Update runbooks
4. Create preventive measures

**Post-Mortem Template:**
```markdown
# Incident Post-Mortem

**Date:** YYYY-MM-DD
**Duration:** XX minutes
**Severity:** Critical/High/Medium

## What Happened
[Description]

## Root Cause
[What caused it]

## Impact
- Users affected: X
- Revenue impact: $X
- Downtime: X minutes

## Timeline
- HH:MM - Issue detected
- HH:MM - Rollback initiated
- HH:MM - Service restored

## What Went Well
- [List]

## What Didn't Go Well
- [List]

## Action Items
- [ ] Prevent recurrence
- [ ] Improve detection
- [ ] Update procedures
```

---

## 🛡️ Preventing Need for Rollbacks

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Staging environment tested
- [ ] Migration tested on staging
- [ ] Rollback plan documented
- [ ] Feature flags in place
- [ ] Monitoring alerts configured
- [ ] Backup created
- [ ] Team notified of deployment

### Deployment Best Practices

1. **Deploy during low-traffic hours**
2. **Use feature flags for new features**
3. **Canary deployments** (5% → 25% → 50% → 100%)
4. **Monitor for 30 minutes post-deploy**
5. **Have rollback ready to execute**

### Database Migration Safety

```sql
-- Always wrap in transaction
BEGIN;

-- Make changes
ALTER TABLE orders ADD COLUMN new_field TEXT;

-- Test the change
SELECT * FROM orders LIMIT 1;

-- Commit only if successful
COMMIT;
-- OR
ROLLBACK;
```

---

## 🔗 Related Documentation

- [Production Guardrails](./PRODUCTION_GUARDRAILS_V2.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Monitoring & Alerts](./MONITORING.md)
- [Incident Response](./INCIDENT_RESPONSE.md)

---

## 📱 Emergency Contacts

**On-Call Engineer:** [Phone/Slack]
**Database Admin:** [Phone/Slack]
**Platform Owner:** [Phone/Slack]
**Vercel Support:** support@vercel.com
**Supabase Support:** support@supabase.io

---

**Last Updated:** 2025-10-06
**Maintained By:** Engineering Team
**Review Frequency:** Monthly
