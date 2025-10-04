# Tidyhood - Harlem Laundry & Home Cleaning MVP

A production-ready MVP for laundry and home cleaning services in Harlem, built with Next.js 14, Supabase, Stripe, and Twilio.

## 🎯 Features

### Core Functionality
- ✅ **Two Service Flows**: Laundry (per-pound pricing) and Home Cleaning (flat rate by unit size)
- ✅ **ZIP Code Gating**: Service limited to 10026, 10027, 10030 with waitlist for others
- ✅ **Capacity Management**: Partner-based slot availability (orders for laundry, minutes for cleaning)
- ✅ **Smart Pricing Engine**: Tax-aware (laundry exempt, cleaning taxable at 8.875%)
- ✅ **Payment Processing**: Stripe integration with idempotency
- ✅ **SMS Notifications**: Twilio integration (console logs in dev mode)
- ✅ **Chain-of-Custody**: QR bag labels for laundry, photo checklists for cleaning
- ✅ **PDF Invoices**: Server-side generation with tax breakdown
- ✅ **Multi-tenant Access**: RLS policies for user/partner/admin roles
- ✅ **Audit Trail**: Complete order event logging

### Security & Validation
- ✅ Row Level Security (RLS) policies
- ✅ Idempotency key enforcement
- ✅ First-order spending cap ($120 default)
- ✅ Capacity over-booking prevention
- ✅ Role-based access control

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (Postgres with RLS)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (for photos)
- **Payments**: Stripe
- **SMS**: Twilio
- **PDF**: PDFKit

## 📁 Project Structure

```
tidyhood/
├── app/
│   ├── api/              # API routes
│   │   ├── price/quote/  # Pricing endpoint
│   │   ├── slots/        # Availability endpoint
│   │   └── orders/       # Order management
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Landing page with ZIP gate
│   └── globals.css       # Global styles
├── lib/
│   ├── db.ts            # Supabase client
│   ├── auth.ts          # Auth helpers
│   ├── pricing.ts       # Pricing engine
│   ├── capacity.ts      # Capacity management
│   ├── sms.ts           # Twilio SMS
│   ├── pdf.ts           # Invoice generation
│   ├── upload.ts        # Photo upload helpers
│   ├── ids.ts           # ID generation
│   └── errors.ts        # Error handling
├── supabase/
│   ├── migrations/
│   │   ├── 001_init.sql # Core schema
│   │   └── 002_rls.sql  # Security policies
│   └── seed/
│       └── seed.sql     # Sample data
└── tests/               # Unit tests (to be implemented)
```

## 🚀 Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Stripe account (test mode)
- Twilio account (optional for SMS, works in console mode)

### 2. Clone and Install

```bash
cd tidyhood
npm install
```

### 3. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings > API to get your keys
3. Go to SQL Editor and run migrations:
   - Copy and run `supabase/migrations/001_init.sql`
   - Copy and run `supabase/migrations/002_rls.sql`
   - Copy and run `supabase/seed/seed.sql`

4. Create the `photos` storage bucket:
   - Go to Storage
   - Click "New bucket"
   - Name: `photos`
   - Public: **No** (private bucket)
   - Click "Create bucket"

5. Create an admin user:
   - Sign up via the Auth UI in your Supabase dashboard
   - Get your user ID from the Users table
   - Run in SQL Editor:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE id = 'your-user-id-here';
   ```

### 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# Site Configuration
NEXT_PUBLIC_SITE_NAME=Tidyhood
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_ZIPS=10026,10027,10030

# Supabase (from Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (optional - will log to console in dev)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_PHONE=+1xxxxxxxxxx

# Admin
ADMIN_EMAIL=you@domain.com

# Business Rules
FIRST_ORDER_CAP_CENTS=12000
LAUNDRY_MIN_LBS=15
NYC_TAX_RATE=0.08875
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📊 Database Schema

### Core Tables

- **profiles**: User profiles with roles (user/partner/admin)
- **orders**: Order records with pricing and status
- **partners**: Laundromat and cleaning service partners
- **capacity_calendar**: Availability slots with unit tracking
- **pricing_rules**: Dynamic pricing configuration
- **bags**: Laundry bag tracking with QR codes
- **cleaning_checklist**: Room-by-room cleaning tasks
- **order_events**: Complete audit trail
- **invoices**: Invoice records with tax breakdown
- **claims**: Lost/damaged/rework claims
- **payouts**: Partner payout tracking

## 🧪 Testing

### Manual Testing Checklist

1. **Laundry Order Flow**:
   - Enter allowed ZIP (10027)
   - Book laundry order (15+ lbs)
   - Select time slot
   - Review pricing (tax-exempt)
   - Make payment
   - Verify SMS sent (console in dev)
   - Check QR bag labels

2. **Cleaning Order Flow**:
   - Enter allowed ZIP (10027)
   - Book cleaning order (2BR/1BA)
   - Select time slot
   - Review pricing (taxable)
   - Make payment
   - Verify SMS sent
   - Check cleaning checklist

3. **Capacity Testing**:
   - Try booking same slot multiple times
   - Verify 409 error when slot full

4. **PDF Invoice**:
   - Complete order and payment
   - Download invoice from order detail
   - Verify tax breakdown

### Run Unit Tests

```bash
npm test
```

## 🚢 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Supabase Production

1. Use production Supabase project
2. Run migrations on production database
3. Update environment variables

## 📈 Key Metrics & KPIs

- **Order Volume**: Track orders by service type
- **Partner SLA**: On-time pickup/delivery rates
- **Customer Satisfaction**: NPS scores
- **Revenue**: GMV and take rate
- **Capacity Utilization**: Slot fill rates
- **Claims Rate**: Lost/damaged items

## 🔒 Security Considerations

- ✅ Row Level Security enabled on all tables
- ✅ Service role key only used server-side
- ✅ Stripe keys properly scoped
- ✅ First-order spending limits
- ✅ Idempotency enforcement
- ✅ Input validation on all endpoints

## 🛠️ Business Rules

### Pricing
- Laundry: $1.75/lb, 15lb minimum ($26.25)
- Cleaning: Studio $89, 1BR $119, 2BR $149, 3BR $179, 4BR+ $219
- Deep cleaning: 1.5x multiplier
- Delivery: $5.99 for laundry (included in cleaning)
- Tax: 8.875% on cleaning only (laundry exempt)

### Capacity
- Laundry: Order-based (max 5-8 per slot per partner)
- Cleaning: Minute-based (calculated by unit size + addons)
- Slots: 2-hour windows, 9 AM - 7 PM

### Turnaround
- Standard laundry: 48 hours
- Rush laundry: 24 hours (+$10)
- Cleaning: Same-day service

## 📞 Support

- Email: support@tidyhood.com
- SMS: Text your order number to get status
- Partner Support: Via partner dashboard

## 🎯 Future Enhancements

### Phase 2 (Post-MVP)
- [ ] Partner mobile apps
- [ ] Route optimization for deliveries
- [ ] Subscription service (15% discount)
- [ ] Referral program
- [ ] Building partnerships (revenue share)
- [ ] Advanced analytics dashboard
- [ ] Customer review system
- [ ] Partner scorecards with penalties

### Technical Debt
- [ ] Add comprehensive test coverage
- [ ] Implement proper error monitoring (Sentry)
- [ ] Add rate limiting
- [ ] Implement caching layer (Redis)
- [ ] Add search/filtering to admin dashboard
- [ ] Build partner mobile apps
- [ ] Add real-time order tracking

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Built for Harlem by the Tidyhood team.

---

**Need Help?** Check the inline code comments or reach out to the development team.
