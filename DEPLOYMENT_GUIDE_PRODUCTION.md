# 🚀 Production Deployment Guide

**Date**: October 6, 2025  
**Status**: Ready for Production Deployment  
**Commit**: 79cd27b

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before deploying to production, verify these are complete:

- [x] Build successful (npm run build) ✅
- [x] All tests passing (89/89) ✅
- [x] Security audit (0 vulnerabilities) ✅
- [x] Code pushed to GitHub ✅
- [x] All 13 production guardrails implemented ✅
- [x] Documentation complete ✅

---

## 🎯 IMMEDIATE POST-DEPLOYMENT ACTIONS

### Action 1: Update Production Environment Variables

**Priority**: CRITICAL - Must be done before deployment  
**Time Required**: 10 minutes

#### Required Environment Variables

Create or update these in your production environment (Vercel/AWS/etc.):

```bash
# Site Configuration
NEXT_PUBLIC_SITE_NAME=Tidyhood
NEXT_PUBLIC_SITE_URL=https://tidyhood.nyc
NEXT_PUBLIC_BASE_URL=https://tidyhood.nyc
NEXT_PUBLIC_ALLOWED_ZIPS=10001,10002,10003 # Your ZIP codes

# Supabase (from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (get from Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (get from Supabase dashboard - KEEP SECRET!)

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza... (from Google Cloud Console)

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (from Stripe dashboard)
STRIPE_SECRET_KEY=sk_live_... (from Stripe dashboard - KEEP SECRET!)
STRIPE_WEBHOOK_SECRET=whsec_... (will get this after configuring webhook)

# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=AC... (from Twilio dashboard)
TWILIO_AUTH_TOKEN=... (32+ characters, from Twilio dashboard - KEEP SECRET!)
TWILIO_FROM_PHONE=+1XXXXXXXXXX (your Twilio phone number in E.164 format)

# Admin Configuration
ADMIN_EMAIL=admin@tidyhood.nyc
SEED_ADMIN_EMAIL=admin@tidyhood.nyc

# Authentication
JWT_PARTNER_ROLE_CLAIM=app_role

# Business Rules
NYC_TAX_RATE=0.08875
FIRST_ORDER_CAP_CENTS=10000
LAUNDRY_MIN_LBS=8

# Feature Flags (set as needed)
NEXT_PUBLIC_ENABLE_PARTNER_PORTAL=true
NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR=true
NEXT_PUBLIC_ENABLE_AUTO_ASSIGN=false
NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS=true

# Sentry (for error tracking)
SENTRY_DSN=https://...@o...ingest.sentry.io/... (from Sentry project settings)
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0

# File Storage
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=tidyhood-documents
```

#### Verification

After setting environment variables:

```bash
# Deploy and check logs for environment validation
# If any required vars are missing, you'll see clear error messages
```

---

### Action 2: Run Database Migration 021

**Priority**: CRITICAL - Must be done before processing webhooks  
**Time Required**: 5 minutes

#### Step 1: Connect to Production Database

```bash
# Get your database URL from Supabase dashboard
# It should look like: postgresql://postgres:[password]@[host]:5432/postgres

# Store it temporarily (don't save in files!)
export DATABASE_URL="postgresql://postgres:..."
```

#### Step 2: Run Migration

```bash
# Navigate to project directory
cd /Users/franckkengne/Documents/tidyhood

# Run migration 021 (creates webhook_events table for idempotency)
psql $DATABASE_URL -f supabase/migrations/021_webhook_events.sql
```

#### Step 3: Verify Migration

```bash
# Verify table was created
psql $DATABASE_URL -c "\d webhook_events"

# Expected output:
# Table "public.webhook_events"
# Column    | Type | Collation | Nullable | Default
# ----------+------+-----------+----------+--------
# id        | text |           | not null |
# created_at| timestamptz |    | not null | now()
# processed_at | timestamptz |  |         |
# event_type | text |           | not null |
```

#### Step 4: Test Query

```bash
# Test that we can insert/query
psql $DATABASE_URL -c "SELECT COUNT(*) FROM webhook_events;"

# Expected output: 0 (table is empty)
```

---

### Action 3: Configure Stripe Webhook

**Priority**: CRITICAL - Required for payment processing  
**Time Required**: 10 minutes

#### Step 1: Log into Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Switch to **Production** mode (toggle in top-left)
3. Navigate to: **Developers** → **Webhooks**

#### Step 2: Add Webhook Endpoint

Click "Add endpoint" and configure:

```
Endpoint URL: https://tidyhood.nyc/api/webhooks/stripe
Description: Tidyhood Production Webhook
API Version: Latest (2024-10-28 or newer)
```

#### Step 3: Select Events

Select these events:
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `charge.succeeded`
- ✅ `charge.failed`

#### Step 4: Get Signing Secret

1. After creating the endpoint, click on it
2. Click "Reveal" next to "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Add to production environment:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Step 5: Test Webhook

In Stripe dashboard:
1. Click "Send test webhook"
2. Select `checkout.session.completed`
3. Click "Send test webhook"

Check your application logs - should see:
```
Webhook received: checkout.session.completed
Webhook processed successfully
```

#### Step 6: Monitor Webhook Delivery

Over next 24 hours, monitor:
- Stripe dashboard → Webhooks → Your endpoint → Check "Success rate"
- Target: >99% success rate

---

### Action 4: Verify Sentry Setup

**Priority**: HIGH - Critical for production monitoring  
**Time Required**: 5 minutes

#### Step 1: Get Sentry DSN

1. Go to https://sentry.io
2. Select your project (or create one)
3. Go to: **Settings** → **Projects** → [Your Project] → **Client Keys (DSN)**
4. Copy the DSN
5. Add to production environment:

```bash
SENTRY_DSN=https://...@o...ingest.sentry.io/...
SENTRY_ENVIRONMENT=production
```

#### Step 2: Deploy with Sentry

After deploying, Sentry will automatically start capturing errors.

#### Step 3: Send Test Error

Create a test endpoint or use browser console:

```javascript
// In browser console on your production site
throw new Error('Test Sentry Integration');
```

#### Step 4: Verify in Sentry Dashboard

1. Go to Sentry dashboard
2. Navigate to **Issues**
3. You should see your test error appear within seconds

#### Step 5: Configure Alerts

In Sentry dashboard:
1. Go to **Alerts** → **Create Alert**
2. Set up alert for: "Error rate > 1% for 5 minutes"
3. Add notification: Email to your team

---

### Action 5: Test Rate Limiting

**Priority**: MEDIUM - Security verification  
**Time Required**: 5 minutes

#### Test with cURL

```bash
# Test waitlist endpoint (rate limit: 3 requests/minute per IP)
for i in {1..5}; do
  echo "Request $i:"
  curl -X POST https://tidyhood.nyc/api/waitlist \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "zip_code": "10001",
      "service_interest": "laundry"
    }' \
    -w "\nHTTP Status: %{http_code}\n\n"
  sleep 1
done
```

#### Expected Results

```
Request 1: HTTP 200 (Success)
Request 2: HTTP 200 (Success)
Request 3: HTTP 200 (Success)
Request 4: HTTP 429 (Too Many Requests - Rate Limited) ✅
Request 5: HTTP 429 (Too Many Requests - Rate Limited) ✅
```

#### Monitor Rate Limiting

Check application logs for:
```
Rate limit hit: waitlist:192.168.1.1
Rate limit: 3/60000ms exceeded
```

---

## 📊 24-HOUR MONITORING CHECKLIST

After deployment, monitor these metrics for 24 hours:

### Critical Metrics

- [ ] **Sentry Error Rate** < 1%
  - Check: https://sentry.io → Your Project → Issues
  - Alert if: Error rate > 1% for 5 minutes

- [ ] **API Response Times** p95 < 500ms
  - Check: Your monitoring dashboard (Vercel/AWS)
  - Alert if: p95 > 1000ms for 10 minutes

- [ ] **Webhook Success Rate** > 99%
  - Check: Stripe Dashboard → Webhooks
  - Alert if: Success rate < 95%

- [ ] **Database Performance** p95 < 100ms
  - Check: Supabase Dashboard → Performance
  - Alert if: Queries consistently > 200ms

### Security Checks

- [ ] **Environment Validation** - Check logs for validation errors
- [ ] **Rate Limiting** - Verify 429 responses are working
- [ ] **Authentication Failures** - Monitor for unusual spikes
- [ ] **RLS Policies** - Check for any violations in logs

### Business Metrics

- [ ] **Order Creation** - Verify orders are being created
- [ ] **Payment Processing** - Check Stripe dashboard
- [ ] **SMS Delivery** - Verify Twilio delivery reports
- [ ] **Email Notifications** - Check email delivery

---

## 🚨 EMERGENCY PROCEDURES

### If Environment Validation Fails

**Symptom**: Server won't start, shows environment validation errors

**Solution**:
```bash
1. Check error message - it will tell you exactly what's missing
2. Add missing environment variable
3. Redeploy
4. If urgent: Temporarily set the var in lib/env.ts to optional:
   - Change: z.string().min(32)
   - To: z.string().min(32).optional()
```

### If Webhook Processing Fails

**Symptom**: Webhooks showing failures in Stripe dashboard

**Solution**:
```bash
1. Check Sentry for error details
2. Check: Are webhook_events table and migration 021 applied?
3. Check: Is STRIPE_WEBHOOK_SECRET set correctly?
4. Test with: Stripe Dashboard → Send test webhook
5. If still failing: Check ROLLBACK_PROCEDURES.md
```

### If Sentry Not Receiving Errors

**Symptom**: No errors showing in Sentry dashboard

**Solution**:
```bash
1. Verify SENTRY_DSN is set in production environment
2. Check Sentry project settings → Client Keys (DSN)
3. Test by throwing error: throw new Error('Test')
4. Check network tab for failed requests to sentry.io
5. Verify sample rate: SENTRY_SAMPLE_RATE=1.0
```

### If Rate Limiting Not Working

**Symptom**: No 429 responses when testing

**Solution**:
```bash
1. Check: Is middleware.ts deployed?
2. Check: Are rate-limit headers present? (X-RateLimit-*)
3. Verify lib/rate-limit.ts is being used
4. Test with: Multiple rapid requests to same endpoint
```

---

## 📋 DEPLOYMENT ROLLBACK

If something goes critically wrong, see: **ROLLBACK_PROCEDURES.md**

Quick rollback:
```bash
# Revert to previous commit
git revert 79cd27b

# Or roll back to specific commit
git reset --hard 79db885  # Previous commit

# Force push (only if necessary!)
git push origin main --force

# Redeploy from previous commit
```

---

## ✅ DEPLOYMENT COMPLETE CHECKLIST

Mark these off as you complete them:

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Secrets stored securely
- [ ] Team notified of deployment

### During Deployment
- [ ] Code deployed successfully
- [ ] Build completed without errors
- [ ] Environment validation passed
- [ ] Health check endpoint responding

### Post-Deployment (Immediate)
- [ ] Migration 021 applied successfully
- [ ] Stripe webhook configured and tested
- [ ] Sentry receiving events
- [ ] Rate limiting tested and working
- [ ] First test order processed successfully

### Post-Deployment (24 Hours)
- [ ] Error rate < 1%
- [ ] Response times within targets
- [ ] No security incidents
- [ ] Webhook success rate > 99%
- [ ] Database performance acceptable
- [ ] All business metrics normal

### Post-Deployment (1 Week)
- [ ] Cost metrics reviewed
- [ ] Performance optimizations identified
- [ ] User feedback collected
- [ ] Post-mortem scheduled (if any issues)

---

## 🎉 SUCCESS CRITERIA

Your deployment is successful when:

✅ Build deployed without errors  
✅ Environment validation passing  
✅ Health checks green  
✅ Migration 021 applied  
✅ Webhooks processing (>99% success)  
✅ Sentry receiving errors  
✅ Rate limiting working  
✅ Error rate < 1%  
✅ Response times < 500ms p95  
✅ First production order completed  

---

## 📞 SUPPORT

### Getting Help

- **Documentation**: See PRODUCTION_GUARDRAILS_V2_COMPLETE.md
- **Rollback**: See ROLLBACK_PROCEDURES.md
- **Monitoring**: Sentry dashboard for errors
- **Payments**: Stripe dashboard for webhook status

### Key Resources

- **Sentry Dashboard**: https://sentry.io
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Repository**: https://github.com/sopap/tidyhood

---

*Generated: October 6, 2025*  
*Commit: 79cd27b*  
*Status: Ready for Production*
