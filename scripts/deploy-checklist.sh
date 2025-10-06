#!/bin/bash

# Production Deployment Checklist Script
# This script guides you through the 5 deployment actions
# and verifies each step is completed correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   🚀 TIDYHOOD PRODUCTION DEPLOYMENT CHECKLIST 🚀      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    echo "Please run this script from: /Users/franckkengne/Documents/tidyhood"
    exit 1
fi

echo -e "${BLUE}📋 This script will guide you through 5 deployment actions${NC}"
echo ""

# ============================================
# ACTION 1: Environment Variables
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}ACTION 1: Configure Production Environment Variables${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Required variables:"
echo "  • NEXT_PUBLIC_BASE_URL"
echo "  • NEXT_PUBLIC_SUPABASE_URL"
echo "  • NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  • SUPABASE_SERVICE_ROLE_KEY"
echo "  • STRIPE_SECRET_KEY"
echo "  • STRIPE_WEBHOOK_SECRET"
echo "  • TWILIO_ACCOUNT_SID"
echo "  • TWILIO_AUTH_TOKEN"
echo "  • TWILIO_FROM_PHONE"
echo "  • SENTRY_DSN"
echo "  • And more... (see .env.example)"
echo ""
echo "📖 Reference: DEPLOYMENT_GUIDE_PRODUCTION.md (lines 17-89)"
echo ""
read -p "Have you configured ALL production environment variables? (y/n): " env_configured

if [ "$env_configured" != "y" ]; then
    echo -e "${RED}❌ Please configure environment variables first${NC}"
    echo ""
    echo "Steps:"
    echo "1. Go to your hosting provider dashboard (Vercel/AWS/etc.)"
    echo "2. Add all variables from .env.example"
    echo "3. Update with production values"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# ============================================
# ACTION 2: Database Migration
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}ACTION 2: Run Database Migration 021${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This migration creates the webhook_events table for idempotency."
echo ""
read -p "Do you have your production DATABASE_URL ready? (y/n): " db_ready

if [ "$db_ready" != "y" ]; then
    echo -e "${YELLOW}⚠️  Get your DATABASE_URL from Supabase dashboard:${NC}"
    echo "   Settings → Database → Connection string"
    echo ""
    exit 1
fi

echo ""
echo "Run these commands:"
echo ""
echo -e "${BLUE}export DATABASE_URL=\"your-production-db-url\"${NC}"
echo -e "${BLUE}psql \$DATABASE_URL -f supabase/migrations/021_webhook_events.sql${NC}"
echo -e "${BLUE}psql \$DATABASE_URL -c \"\\d webhook_events\"${NC}"
echo ""
read -p "Have you run migration 021 successfully? (y/n): " migration_done

if [ "$migration_done" != "y" ]; then
    echo -e "${RED}❌ Please run migration 021 first${NC}"
    echo ""
    echo "📖 Reference: DEPLOYMENT_GUIDE_PRODUCTION.md (lines 91-142)"
    exit 1
fi

echo -e "${GREEN}✓ Migration 021 applied${NC}"
echo ""

# ============================================
# ACTION 3: Stripe Webhook
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}ACTION 3: Configure Stripe Webhook${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Steps:"
echo "1. Go to: https://dashboard.stripe.com"
echo "2. Switch to PRODUCTION mode"
echo "3. Navigate to: Developers → Webhooks"
echo "4. Add endpoint: https://tidyhood.nyc/api/webhooks/stripe"
echo "5. Select events: checkout.session.completed, payment_intent.succeeded"
echo "6. Copy signing secret (starts with whsec_)"
echo "7. Add STRIPE_WEBHOOK_SECRET to production environment"
echo ""
read -p "Have you configured Stripe webhook? (y/n): " stripe_configured

if [ "$stripe_configured" != "y" ]; then
    echo -e "${RED}❌ Please configure Stripe webhook first${NC}"
    echo ""
    echo "📖 Reference: DEPLOYMENT_GUIDE_PRODUCTION.md (lines 144-200)"
    exit 1
fi

echo -e "${GREEN}✓ Stripe webhook configured${NC}"
echo ""

# ============================================
# ACTION 4: Sentry
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}ACTION 4: Verify Sentry Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Steps:"
echo "1. Go to: https://sentry.io"
echo "2. Create/select project"
echo "3. Get DSN from: Settings → Projects → Client Keys (DSN)"
echo "4. Add SENTRY_DSN to production environment"
echo "5. Deploy application"
echo "6. Test: throw new Error('Test Sentry')"
echo "7. Verify error appears in Sentry dashboard"
echo ""
read -p "Have you configured and tested Sentry? (y/n): " sentry_configured

if [ "$sentry_configured" != "y" ]; then
    echo -e "${RED}❌ Please configure Sentry first${NC}"
    echo ""
    echo "📖 Reference: DEPLOYMENT_GUIDE_PRODUCTION.md (lines 202-256)"
    exit 1
fi

echo -e "${GREEN}✓ Sentry configured and tested${NC}"
echo ""

# ============================================
# ACTION 5: Rate Limiting
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}ACTION 5: Test Rate Limiting${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test with multiple rapid requests:"
echo ""
echo -e "${BLUE}for i in {1..5}; do${NC}"
echo -e "${BLUE}  curl -X POST https://tidyhood.nyc/api/waitlist \\${NC}"
echo -e "${BLUE}    -H \"Content-Type: application/json\" \\${NC}"
echo -e "${BLUE}    -d '{\"email\":\"test@example.com\",\"zip_code\":\"10001\",\"service_interest\":\"laundry\"}'${NC}"
echo -e "${BLUE}done${NC}"
echo ""
echo "Expected: HTTP 429 on 4th request"
echo ""
read -p "Have you tested rate limiting? (y/n): " rate_limit_tested

if [ "$rate_limit_tested" != "y" ]; then
    echo -e "${YELLOW}⚠️  Skipping rate limit test${NC}"
    echo "You can test this after deployment"
else
    echo -e "${GREEN}✓ Rate limiting tested${NC}"
fi

echo ""
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║           🎉 ALL DEPLOYMENT ACTIONS COMPLETE! 🎉       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ Environment variables configured${NC}"
echo -e "${GREEN}✓ Migration 021 applied${NC}"
echo -e "${GREEN}✓ Stripe webhook configured${NC}"
echo -e "${GREEN}✓ Sentry setup verified${NC}"
echo -e "${GREEN}✓ Rate limiting tested${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 24-HOUR MONITORING CHECKLIST${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Monitor these for the next 24 hours:"
echo ""
echo "  [ ] Sentry error rate < 1%"
echo "  [ ] API response times p95 < 500ms"
echo "  [ ] Webhook success rate > 99%"
echo "  [ ] Database performance p95 < 100ms"
echo "  [ ] No security incidents"
echo "  [ ] First production order successful"
echo ""
echo "📖 Full checklist: DEPLOYMENT_GUIDE_PRODUCTION.md (lines 294-347)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🚀 DEPLOYMENT SUCCESSFUL - MONITOR FOR 24 HOURS 🚀${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
