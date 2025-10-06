# Cleaning V2 UI - Testing Guide

**Feature Flag**: ✅ **ENABLED** (`NEXT_PUBLIC_FLAG_CLEANING_V2=1`)  
**Date**: October 5, 2025  
**Status**: Ready for Local Testing

---

## 🚀 Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or next available port)

### 2. Navigate to a Cleaning Order

You'll need a cleaning order to test. If you don't have one, you can:
- **Option A**: Create a new cleaning order through the booking flow
- **Option B**: Check your database for existing cleaning orders
- **Option C**: Use the admin panel to view orders

---

## ✅ Testing Checklist

### **Phase 1: Timeline Stage Descriptions** ✅

**What to test**: Timeline shows correct descriptions for each stage

#### Test Scenarios

- [ ] **Scheduled Stage**
  - Navigate to an order in "scheduled" or "pending" status
  - **Expected**: Timeline shows "Your cleaner will arrive during the scheduled time window."
  - **Bug Fixed**: Should NOT show "Cleaning is underway"

- [ ] **In Progress Stage**
  - Navigate to an order in "in_progress" status
  - **Expected**: Shows "Cleaning is currently in progress."

- [ ] **Completed Stage**
  - Navigate to a completed order
  - **Expected**: Shows "Cleaning completed. Thanks for using TidyHood!"

**Pass Criteria**: ✅ Each stage shows the correct, contextual description

---

### **Phase 2: Service Details Polish** ✅

**What to test**: Enhanced service details layout and styling

#### Test Scenarios

- [ ] **Large Numbers Display**
  - **Check**: Bedrooms and Bathrooms numbers are large (2xl font)
  - **Expected**: Numbers are prominently displayed and easy to read

- [ ] **Square Footage**
  - **Check**: If order has `square_feet`, it displays properly
  - **Expected**: Shows formatted number with "sq ft" label (e.g., "1,200 sq ft")
  - **Note**: If not in database, this field won't show (expected behavior)

- [ ] **Deep Clean Badge**
  - Find an order with `deep: true`
  - **Expected**: Purple badge with star emoji "🌟 Deep Clean"
  - **Style**: Purple background, border, star emoji

- [ ] **Add-ons Display**
  - Find an order with addons (e.g., "Inside fridge", "Inside oven")
  - **Expected**: 
    - Each addon shows checkmark icon (✓)
    - Blue badges with nice borders
    - Count shown in header: "Extra Services (3)"

- [ ] **Responsive Grid**
  - **Desktop (>768px)**: 3 columns (Bedrooms | Bathrooms | Size)
  - **Mobile (≤375px)**: 2 columns (Bedrooms | Bathrooms stacked)
  - Use browser DevTools to test responsive behavior

**Pass Criteria**: ✅ Service Details looks professional, numbers are large, grid is responsive

---

### **Phase 3: Partner Info Card** ✅ **(NEW!)**

**What to test**: Partner information display with photo, rating, and contact

#### Test Scenarios

- [ ] **Card Appears (Partner Assigned)**
  - Find an order where `partner_id` is not null
  - **Expected**: Beautiful gradient card (blue-purple) appears between Timeline and Service Details
  - **Card includes**:
    - Partner photo (or letter avatar if no photo)
    - Partner name
    - Star rating (e.g., ⭐ 4.8)
    - Review count (e.g., "127 reviews")
    - "Verified Professional" badge with checkmark
    - Contact button

- [ ] **Card Hidden (No Partner)**
  - Find an order where `partner_id` is null
  - **Expected**: Partner Info Card does NOT show
  - **Pass**: Clean layout without empty card

- [ ] **Avatar Fallback**
  - Find partner without `photo_url`
  - **Expected**: Shows letter avatar (first letter of name in gradient circle)
  - **Example**: "John Smith" → "J" in blue-purple gradient circle

- [ ] **Contact Button (Desktop)**
  - Desktop view (>768px)
  - **Expected**: Inline "Contact" button next to partner info
  - **Icon**: Phone icon included

- [ ] **Contact Button (Mobile)**
  - Mobile view (≤375px)
  - **Expected**: Full-width "Contact [Partner Name]" button below info
  - **Tap target**: Large (min 44px height)

- [ ] **Contact Functionality**
  - Click/tap the contact button
  - **Expected on mobile**: Opens phone dialer with partner's phone number
  - **Expected on desktop**: Opens phone dialer or fallback to contact page
  - **Note**: Requires partner to have `phone` in database

- [ ] **Loading State**
  - Hard refresh page while viewing order
  - **Expected**: Shows skeleton loader while fetching partner data
  - **Duration**: Brief loading indicator

- [ ] **Error Handling**
  - If partner data fails to load
  - **Expected**: Card silently doesn't show (graceful failure)
  - **No error**: Should not break page or show error message

**Pass Criteria**: ✅ Partner card shows with all info, responsive, contact works

---

## 📱 Responsive Testing

### Mobile Testing (≤375px)

Use Chrome DevTools Device Toolbar:
1. Open DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M / Cmd+Shift+M)
3. Select "iPhone SE" or set width to 375px

**Check**:
- [ ] Service Details: 2-column grid
- [ ] Partner Card: Full-width contact button
- [ ] Timeline: Horizontal scroll works smoothly
- [ ] All text is readable
- [ ] Buttons have large tap targets (44px)

### Tablet Testing (768px)

Set DevTools width to 768px

**Check**:
- [ ] Service Details: 3-column grid appears
- [ ] Partner Card: Inline contact button appears
- [ ] Layout doesn't break

### Desktop Testing (>1024px)

Full browser window

**Check**:
- [ ] Everything scales nicely
- [ ] Max-width container keeps content centered
- [ ] No overflow or layout issues

---

## 🐛 Common Issues & Solutions

### Issue: "Feature flag not working"

**Symptoms**: Still seeing old UI  
**Solution**:
1. Check `.env.local` has `NEXT_PUBLIC_FLAG_CLEANING_V2=1`
2. Restart dev server (`Ctrl+C`, then `npm run dev`)
3. Hard refresh browser (`Ctrl+Shift+R` / Cmd+Shift+R`)

### Issue: "Partner Card not showing"

**Symptoms**: Card doesn't appear  
**Possible causes**:
1. Order doesn't have `partner_id` (expected - card should be hidden)
2. API error (check browser console for errors)
3. Partner not in database

**Debug**:
```javascript
// Check in browser console:
console.log(order.partner_id); // Should have a value
```

### Issue: "Timeline still shows wrong description"

**Symptoms**: "Cleaning is underway" under Scheduled  
**Solution**:
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check that latest code is pulled (`git pull origin main`)

### Issue: "Square footage not showing"

**Symptoms**: Size column missing  
**Expected**: This is OK if order doesn't have `square_feet` in database  
**To add**: Update order in database with `square_feet` value

---

## 💾 Test Data Setup (Optional)

### Creating Test Orders

If you need test orders with specific data:

```sql
-- Update existing order to have square footage
UPDATE orders 
SET order_details = jsonb_set(
  order_details, 
  '{square_feet}', 
  '1200'
)
WHERE id = 'your-order-id';

-- Update order to have deep clean
UPDATE orders 
SET order_details = jsonb_set(
  order_details, 
  '{deep}', 
  'true'
)
WHERE id = 'your-order-id';

-- Update order to have addons
UPDATE orders 
SET order_details = jsonb_set(
  order_details, 
  '{addons}', 
  '["Inside fridge", "Inside oven", "Laundry"]'::jsonb
)
WHERE id = 'your-order-id';

-- Assign partner to order
UPDATE orders 
SET partner_id = 'your-partner-id'
WHERE id = 'your-order-id';
```

---

## 📊 Success Metrics

After testing, evaluate:

- [ ] **No visual bugs** - Everything renders correctly
- [ ] **Responsive** - Works on mobile, tablet, desktop
- [ ] **Performance** - Page loads quickly, no lag
- [ ] **Professional** - Looks polished and production-ready
- [ ] **Functional** - All buttons/links work as expected

---

## 🎯 Next Steps After Testing

### If Everything Works ✅

1. Document any edge cases discovered
2. Take screenshots of improvements
3. Share feedback with team
4. Plan production rollout

### If Issues Found 🐛

1. Document the issue clearly:
   - What you were testing
   - What you expected
   - What actually happened
   - Screenshots if possible
2. Check browser console for errors
3. Report to development team

---

## 📸 Screenshot Checklist

Capture these for documentation:

- [ ] **Before/After Timeline** - Show description fix
- [ ] **Service Details** - Large numbers, grid layout
- [ ] **Partner Card (Desktop)** - Full card with inline button
- [ ] **Partner Card (Mobile)** - Full-width button variant
- [ ] **Deep Clean Badge** - Purple styling
- [ ] **Add-ons** - Checkmark badges
- [ ] **Mobile View** - Full responsive layout

---

## 🔧 Developer Tools

### Useful Browser Console Commands

```javascript
// Check feature flag
console.log(process.env.NEXT_PUBLIC_FLAG_CLEANING_V2);

// Inspect order object
console.log(order);

// Check partner_id
console.log(order.partner_id);

// Check service type
console.log(order.service_type); // Should be 'CLEANING'
```

### Network Tab

Watch for:
- `/api/partners/[id]` - Partner data fetch
- `/api/orders/[id]` - Order data fetch
- Any 404 or 500 errors

---

## 🎉 Testing Complete!

Once you've verified all items on the checklist:

✅ **All 3 phases tested and working**  
✅ **Mobile responsive**  
✅ **No visual bugs**  
✅ **Performance is good**

**You're ready to deploy to staging!**

---

**Last Updated**: October 5, 2025  
**Tester**: [Your Name]  
**Environment**: Local Development  
**Feature Flag**: `CLEANING_V2=1`
