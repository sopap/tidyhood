# Phase 4: Data Fixes & Bulk Operations - Action Plan

**Priority:** HIGH (fixes foundational data issues)  
**Estimated Time:** 2-3 hours  
**Status:** Ready to start

## Overview

Phase 4 addresses underlying data quality issues and adds essential management tools for the ops team.

---

## Problems to Solve

### 1. Partner Defaults Issue
**Current State:**
- Partners have `max_orders_per_slot` defaulting to 1
- Screenshots show "0 / 10 orders" but partner configs say "1 orders"
- This creates confusion and limits actual capacity

**Root Cause:**
- Partner edit form defaults to 1 in the UI
- No validation of reasonable capacity limits

**Fix Needed:**
- Update partner form to suggest reasonable defaults (e.g., 10 for laundry)
- Add validation (min: 1, max: 50 with warnings)
- Provide context help explaining capacity

### 2. No Bulk Management Tools
**Current State:**
- Can only delete slots one at a time
- No way to clean up old/test data easily
- No bulk edit operations

**Fix Needed:**
- Add checkbox selection to capacity table
- Bulk delete functionality
- "Select all" / "Select none" options
- Confirmation dialog showing count

### 3. Data Quality Issues
**Current State:**
- Unknown number of slots with incorrect data
- No audit tools to find issues

**Fix Needed:**
- Script to audit current capacity data
- Report on anomalies (0 capacity, etc.)
- Optional cleanup script

---

## Implementation Tasks

### Task 1: Fix Partner Form Defaults ⏱️ 30 min
**File:** `app/admin/partners/[id]/edit/page.tsx`

**Changes:**
1. Update `max_orders_per_slot` default from 1 to 10
2. Add input validation (1-50 range)
3. Add help text: "How many orders can this partner handle per 2-hour slot?"
4. Add warning for values > 20: "High capacity - are you sure?"

### Task 2: Add Bulk Delete UI ⏱️ 1 hour
**File:** `app/admin/capacity/page.tsx`

**Changes:**
1. Add checkbox column to table
2. Add "Select All" / "Deselect All" buttons
3. Add "Delete Selected (X)" button (disabled when nothing selected)
4. Update state to track selected slot IDs
5. Bulk delete confirmation modal
6. Call bulk delete API endpoint

### Task 3: Create Bulk Delete API ⏱️ 30 min
**New File:** `app/api/admin/capacity/bulk-delete/route.ts`

**Functionality:**
- Accept array of slot IDs
- Validate no slots have reservations
- Delete in transaction
- Return success/failure count

### Task 4: Data Audit Script ⏱️ 30 min
**New File:** `scripts/audit-capacity-data.js`

**Checks:**
- Slots with max_units = 0
- Slots with reserved > max
- Partners with max_orders_per_slot = 1
- Old slots (> 90 days past)
- Generate report

### Task 5: Optional Data Cleanup Script ⏱️ 15 min
**New File:** `scripts/cleanup-capacity-data.js`

**Actions:**
- Delete slots > 90 days old (configurable)
- Fix partners with suspicious configs
- Dry-run mode by default

---

## Implementation Order

**Recommended sequence:**
1. ✅ Run audit script first (see current state)
2. ✅ Fix partner form defaults (prevent future issues)
3. ✅ Add bulk delete UI & API (enable cleanup)
4. ✅ Run cleanup script if needed
5. ✅ Document changes

---

## Success Criteria

- [ ] Partner form defaults to 10 orders/slot
- [ ] Partner form has validation and help text
- [ ] Can select multiple slots with checkboxes
- [ ] Can bulk delete selected slots
- [ ] Audit script identifies data issues
- [ ] Cleanup script available (optional use)

---

## Risk Assessment

**Low Risk:**
- Partner form changes only affect new edits
- Bulk delete requires explicit selection & confirmation
- Scripts are non-destructive by default

**No Breaking Changes:**
- Existing functionality preserved
- Backward compatible
- No database schema changes

---

## Next Steps After Phase 4

**Option A: Phase 3 - Bulk Creation Wizard** (6-8 hours)
- Multi-step wizard for fast slot creation
- Capacity templates (Standard/Busy/Slow Week)
- 60x time savings (30 min → 30 sec)

**Option B: Stop Here**
- Core UX issues solved (Phase 1 & 2)
- Data quality ensured (Phase 4)
- Bulk wizard can wait for later

---

**Ready to start Phase 4?**

Shall I proceed with:
1. **Full Phase 4** (all tasks, 2-3 hours)
2. **Quick wins only** (Tasks 1-3, 1.5 hours)
3. **Different priority** (let me know what's most important)
