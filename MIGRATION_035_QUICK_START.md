# Migration 035: Quick Start Guide

## Running the Migration

You run `supabase db push` from your **terminal** in the project root directory.

### Step-by-Step Instructions

#### 1. Open Terminal
- In VS Code: Terminal → New Terminal (or `Ctrl+` backtick)
- Or use your system terminal app

#### 2. Ensure You're in Project Directory
```bash
pwd
# Should show: /Users/franckkengne/Documents/tidyhood

# If not, navigate there:
cd /Users/franckkengne/Documents/tidyhood
```

#### 3. Run the Migration

**Option A: Using Supabase CLI (Recommended)**

```bash
supabase db push
```

This will:
- Detect all new migrations in `supabase/migrations/`
- Apply migration 035 to your database
- Show success/error messages

**Option B: Via Supabase Dashboard**

If you don't have the CLI:

1. Visit https://supabase.com/dashboard
2. Select your TidyHood project
3. Go to SQL Editor
4. Copy contents of `supabase/migrations/035_guest_booking_and_policy_versioning.sql`
5. Paste and click "Run"

#### 4. Verify Migration

```bash
node scripts/run-migration-035.js
```

This will:
- Check if new columns exist
- Test database constraints
- Show example queries

---

## Installing Supabase CLI (If Needed)

If you see "command not found: supabase":

```bash
# On macOS (via Homebrew)
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

Then link your project:

```bash
supabase link --project-ref your-project-ref-id
```

(Get project-ref from your Supabase dashboard URL)

---

## Troubleshooting

### Error: "command not found: supabase"
→ Install Supabase CLI (see above)

### Error: "Project not linked"
→ Run `supabase link --project-ref <your-ref>`

### Error: "Permission denied"
→ Ensure you're logged in: `supabase login`

### Error: "Migration already applied"
→ This is fine! Migration was already run.

---

## Alternative: Use Existing Migration Script

If you prefer not to use Supabase CLI, you can also use the dashboard method (Option B above) or connect directly via psql if you have the database connection string.

---

## After Migration

1. ✅ Verify: `node scripts/run-migration-035.js`
2. ✅ Test policy API: `curl http://localhost:3000/api/policies/cancellation?service=CLEANING`
3. ✅ Review documentation: `MIGRATION_035_COMPLETE_SUMMARY.md`

---

**TL;DR**: Open terminal, type `supabase db push`, press Enter. That's it! 🚀
