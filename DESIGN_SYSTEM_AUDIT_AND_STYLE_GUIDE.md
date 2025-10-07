# Design System Audit & Style Guide
**Generated:** October 7, 2025  
**Status:** 🔴 Needs Attention - Inconsistencies Found

## Executive Summary

After auditing the application's styling across order detail pages (`/orders/[id]`), booking pages (`/book/cleaning`, `/book/laundry`), and key components, I've identified **inconsistent design patterns** that reduce the cohesive feel across the app. While a solid foundation exists with `design-tokens.ts` and Tailwind config, the implementation varies significantly across pages.

### Key Issues:
- ❌ **Mixed color naming** (`blue-600` vs `primary-600` vs `brand`)
- ❌ **Inconsistent card styling** (3 different radius values, varying shadows)
- ❌ **Scattered spacing patterns** (no unified rhythm)
- ❌ **Typography hierarchy unclear** (heading sizes vary)
- ❌ **Component duplication** (status badges, info banners reinvented)

---

## 🎨 Official Style Guide

### Color System

#### Primary Colors
```css
/* USE THESE - Semantic naming */
brand: #1F6FEB           /* Primary actions, links */
brand-50: #EFF5FF        /* Lightest tint for backgrounds */
brand-600: #1F6FEB       /* Default brand color */
brand-700: #1A5FD0       /* Hover states */

/* ❌ DON'T USE: blue-600, primary-600 directly */
/* ✅ DO USE: bg-brand, text-brand, border-brand */
```

#### Status Colors
```css
success: #16A34A         /* Completed, confirmed states */
warning: #F59E0B         /* Pending, requires attention */
error: #DC2626           /* Errors, failures, cancellations */
```

#### UI Colors
```css
background: #F7F7F9      /* Page background */
surface: #FFFFFF         /* Card/modal background */
border: #E5E7EB          /* Default borders */
```

#### Text Colors (WCAG AA Compliant)
```css
text-DEFAULT: #0F172A    /* Primary text (21:1 contrast) */
text-secondary: #334155  /* Secondary text (8.6:1) */
text-tertiary: #475569   /* Tertiary text (5.9:1) - use sparingly */
```

### Typography Hierarchy

```tsx
/* Page Titles */
<h1 className="text-3xl md:text-4xl font-bold text-text mb-4">
  Main Page Title
</h1>

/* Section Headings */
<h2 className="text-xl md:text-2xl font-bold text-text mb-4">
  Section Title
</h2>

/* Card Headings */
<h3 className="text-base md:text-lg font-semibold text-text mb-3">
  Card Title
</h3>

/* Body Text */
<p className="text-base text-text-secondary leading-relaxed">
  Standard paragraph text
</p>

/* Small Text / Labels */
<span className="text-sm text-text-tertiary">
  Helper text
</span>

/* Micro Text */
<span className="text-xs text-text-tertiary">
  Metadata, timestamps
</span>
```

### Card Components

#### Standard Card
```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
  {/* Content */}
</div>
```

**Variants:**
- **Compact**: `p-4 md:p-5` (for dense info)
- **Spacious**: `p-6 md:p-8` (for main content)
- **Mobile-optimized**: `p-4 sm:p-5 md:p-6` (responsive padding)

#### Info/Alert Banners

```tsx
/* Success Banner */
<div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
  <div className="flex items-start gap-3">
    <span className="text-2xl flex-shrink-0">✓</span>
    <div>
      <h3 className="font-semibold text-green-900 mb-1">Success Title</h3>
      <p className="text-sm text-green-700">Description text here</p>
    </div>
  </div>
</div>

/* Warning Banner */
<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
  <div className="flex items-start gap-3">
    <span className="text-2xl flex-shrink-0">⚠️</span>
    <div>
      <h3 className="font-semibold text-yellow-900 mb-1">Warning Title</h3>
      <p className="text-sm text-yellow-700">Description text here</p>
    </div>
  </div>
</div>

/* Info Banner */
<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
  <div className="flex items-start gap-3">
    <span className="text-2xl flex-shrink-0">📋</span>
    <div>
      <h3 className="font-semibold text-blue-900 mb-1">Info Title</h3>
      <p className="text-sm text-blue-700">Description text here</p>
    </div>
  </div>
</div>

/* Error Banner */
<div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
  <div className="flex items-start gap-3">
    <span className="text-2xl flex-shrink-0">❌</span>
    <div>
      <h3 className="font-semibold text-red-900 mb-1">Error Title</h3>
      <p className="text-sm text-red-700">Description text here</p>
    </div>
  </div>
</div>
```

### Button System

```tsx
/* Primary Action - Use existing class */
<button className="btn-primary">
  Primary Action
</button>

/* Secondary Action */
<button className="btn-secondary">
  Secondary Action
</button>

/* Destructive Action */
<button className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 active:bg-red-800 transition-colors">
  Delete
</button>

/* Text/Link Button */
<button className="text-brand hover:text-brand-700 font-medium transition-colors">
  Learn More
</button>
```

### Status Badges

```tsx
/* Status Badge Component (Recommended) */
interface StatusBadgeProps {
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

/* Implementation */
<span className={`
  inline-flex items-center gap-2 rounded-full font-medium
  ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : ''}
  ${size === 'md' ? 'px-3 py-1 text-sm' : ''}
  ${size === 'lg' ? 'px-4 py-2 text-base' : ''}
  ${color === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-200' : ''}
  ${color === 'green' ? 'bg-green-100 text-green-800 border border-green-200' : ''}
  ${color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : ''}
  ${color === 'red' ? 'bg-red-100 text-red-800 border border-red-200' : ''}
  ${color === 'purple' ? 'bg-purple-100 text-purple-800 border border-purple-200' : ''}
  ${color === 'gray' ? 'bg-gray-100 text-gray-800 border border-gray-200' : ''}
`}>
  {icon && <span>{icon}</span>}
  <span>{label}</span>
</span>
```

### Spacing Scale

Use consistent spacing throughout:

```tsx
/* Vertical Spacing (Stack) */
gap-2   /* 8px - Tight */
gap-3   /* 12px - Compact */
gap-4   /* 16px - Default */
gap-6   /* 24px - Comfortable */
gap-8   /* 32px - Spacious */

/* Section Spacing */
mb-4    /* Between related elements */
mb-6    /* Between sections */
mb-8    /* Between major sections */

/* Responsive Spacing */
space-y-4 md:space-y-6    /* Mobile: 16px, Desktop: 24px */
p-4 md:p-6 lg:p-8         /* Responsive padding */
```

### Pricing Display

```tsx
/* Price Badge - Large */
<div className="bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
  <div className="text-3xl font-bold text-gray-900">
    ${(totalCents / 100).toFixed(2)}
  </div>
  <div className="text-sm font-medium text-gray-600">
    Total
  </div>
</div>

/* Price Summary Card */
<div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>Subtotal:</span>
      <span>${subtotal.toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span>Tax (8.875%):</span>
      <span>${tax.toFixed(2)}</span>
    </div>
    <div className="flex justify-between items-center pt-2 border-t border-brand-200">
      <span className="font-semibold">Total:</span>
      <span className="text-2xl font-bold text-brand-700">
        ${total.toFixed(2)}
      </span>
    </div>
  </div>
</div>
```

### Form Inputs

```tsx
/* Use defined input-field class */
<input
  type="text"
  className="input-field"
  placeholder="Enter value"
/>

/* With Error State */
<input
  type="text"
  className="input-field input-error"
  placeholder="Enter value"
/>
<p className="input-error-text">Error message here</p>

/* With Helper Text */
<input
  type="text"
  className="input-field"
  placeholder="Enter value"
/>
<p className="input-helper">Helper text here</p>
```

### Responsive Patterns

```tsx
/* Mobile-First Layout */
<div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
  {/* Content */}
</div>

/* Two-Column Grid */
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
  {/* Items */}
</div>

/* Hidden on Mobile */
<div className="hidden md:block">
  {/* Desktop-only content */}
</div>

/* Mobile-only */
<div className="md:hidden">
  {/* Mobile-only content */}
</div>
```

---

## 🔍 Audit Findings by Page

### `/orders/[id]` - Order Detail Page

**Issues Found:**
1. ❌ Uses `bg-blue-600` instead of `bg-brand`
2. ❌ Mixed card radii: `rounded-lg` and `rounded-xl`
3. ❌ Inconsistent padding: `p-4`, `p-6` without responsive variants
4. ❌ Status badge uses inline colors instead of component
5. ❌ Gradient header only on cleaning orders (Cleaning V2)

**What Works:**
- ✅ Good responsive back button (mobile sticky, desktop inline)
- ✅ Clear hierarchy with emoji icons
- ✅ Mobile-optimized touch targets

### `/book/cleaning` - Cleaning Booking

**Issues Found:**
1. ❌ Mixes `primary-600` and `primary-50` (should use `brand`)
2. ❌ Inconsistent card spacing: some `p-6`, others `p-4`
3. ❌ Service type selector buttons use inline styles
4. ❌ Live pricing card different from order detail pricing display
5. ❌ Info banners reinvented (5+ variations)

**What Works:**
- ✅ Excellent form structure with clear sections
- ✅ Good use of visual hierarchy
- ✅ Persistent booking data UX is solid

### `/book/laundry` - Laundry Booking

**Issues Found:**
1. ❌ Nearly identical to cleaning but with subtle differences
2. ❌ Same card/button inconsistencies
3. ❌ Weight tier selector slightly different styling than cleaning type selector
4. ❌ Rush service checkbox has unique styling

**What Works:**
- ✅ Consistent with cleaning booking (good!)
- ✅ Clear service type differentiation

### `CleaningOrderView.tsx` - Cleaning V2 Component

**Issues Found:**
1. ❌ Uses many direct color classes (`bg-blue-50`, `text-blue-800`)
2. ❌ Status badge function duplicates logic across components
3. ❌ Different card styling than legacy order view
4. ❌ Gradient header not in legacy view

**What Works:**
- ✅ **Best visual design** in the app - should be the standard!
- ✅ Excellent mobile/desktop responsive patterns
- ✅ Clear action cards
- ✅ Strong typography hierarchy

---

## 🎯 Recommendations

### Immediate Actions (High Priority)

1. **Create Shared Components**
   ```
   components/ui/
     ├── Badge.tsx          (Status badges)
     ├── Card.tsx           (Standard cards)
     ├── InfoBanner.tsx     (Alert/info banners)
     └── PriceDisplay.tsx   (Pricing components)
   ```

2. **Color Migration**
   - Replace all `blue-600` → `brand`
   - Replace all `primary-600` → `brand`
   - Use semantic colors consistently

3. **Standardize Card Styling**
   - Use `rounded-xl` everywhere (16px from design tokens)
   - Always include `border border-gray-200 shadow-sm`
   - Responsive padding: `p-4 md:p-6 lg:p-8`

### Medium Priority

4. **Create Button Component Library**
   - Consolidate all button styles
   - Document variants (primary, secondary, destructive, text)
   - Add loading states

5. **Typography Component**
   - Create `<Heading>` component with level prop
   - Enforce consistent sizing

6. **Unify Order Detail Views**
   - Bring CleaningOrderView's design to laundry orders
   - Add gradient header to all order details
   - Consistent status displays

### Low Priority

7. **Create Storybook**
   - Document all components
   - Visual regression testing

8. **Design Tokens Migration**
   - Move all magic numbers to design-tokens.ts
   - Create CSS custom properties

9. **Dark Mode Preparation**
   - Use semantic color names
   - Test with dark backgrounds

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `components/ui/Badge.tsx`
- [ ] Create `components/ui/InfoBanner.tsx`
- [ ] Create `components/ui/Card.tsx`
- [ ] Update `globals.css` with standardized button classes
- [ ] Document color migration guide

### Phase 2: Migration (Week 2)
- [ ] Update `/book/cleaning` to use new components
- [ ] Update `/book/laundry` to use new components
- [ ] Update `/orders/[id]` to use new components
- [ ] Update `CleaningOrderView` to use new components

### Phase 3: Polish (Week 3)
- [ ] Unify all order detail pages (apply Cleaning V2 design)
- [ ] Add gradient headers everywhere
- [ ] Standardize all spacing
- [ ] Final QA pass

---

## 🎨 Design Token Reference

See `lib/design-tokens.ts` for complete token definitions.

### Quick Reference

```typescript
// Colors
designTokens.colors.brand[600]        // #1F6FEB
designTokens.colors.success[600]      // #16A34A
designTokens.colors.warning[600]      // #F59E0B
designTokens.colors.error[600]        // #DC2626

// Typography
designTokens.typography.fontSize.base // 16px
designTokens.typography.fontSize.xl   // 20px
designTokens.typography.fontSize['3xl'] // 30px

// Spacing
designTokens.spacing[4]               // 16px
designTokens.spacing[6]               // 24px
designTokens.spacing[8]               // 32px

// Shadows
designTokens.shadows.sm               // Subtle
designTokens.shadows.md               // Default
designTokens.shadows.lg               // Pronounced

// Border Radius
designTokens.borderRadius.card        // 16px
designTokens.borderRadius.input       // 12px
```

---

## 💡 Best Practices

### DO ✅
- Use semantic color names (`brand`, `success`, `error`)
- Apply responsive padding (`p-4 md:p-6`)
- Use defined button classes (`btn-primary`)
- Add hover states to interactive elements
- Include emoji icons for visual interest
- Test on mobile devices

### DON'T ❌
- Use direct color values (`blue-600`, `#1F6FEB`)
- Mix different card radii on same page
- Reinvent components (badges, banners)
- Forget mobile responsive variants
- Skip hover/active states
- Use fixed pixel widths

---

## 📚 Additional Resources

- **Tailwind Config**: `tailwind.config.ts`
- **Global Styles**: `app/globals.css`
- **Design Tokens**: `lib/design-tokens.ts`
- **Animation Library**: `lib/animations.ts`
- **Motion Variants**: `lib/motionVariants.ts`

---

**Last Updated:** October 7, 2025  
**Maintainer:** Development Team  
**Status:** 🟡 In Progress - Standardization Underway
