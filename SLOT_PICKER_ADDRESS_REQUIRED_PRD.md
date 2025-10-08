# PRD: Time Slot Picker - Address Required State Implementation

**Document Version:** 1.0  
**Date:** October 8, 2025  
**Priority:** P0 - Critical UX Issue  
**Estimated Implementation Time:** 4-6 hours  
**Target Completion:** Within 1 sprint

---

## 1. EXECUTIVE SUMMARY

### Problem Statement
Users who select a pickup date before entering their address see no time slots and receive no explanation, causing confusion and potential booking abandonment. The time slot section is completely hidden when address is missing.

### Solution
Implement a helpful "Address Required" state that always displays when a date is selected, providing clear guidance to users about why they can't see time slots and how to proceed.

### Success Criteria
- ✅ Time slot section always visible when date is selected (even without address)
- ✅ Clear, helpful messaging when address is missing
- ✅ Smooth scroll-to-address functionality
- ✅ No breaking changes to existing functionality
- ✅ Mobile responsive design
- ✅ Accessibility compliant (WCAG 2.1 AA)

---

## 2. TECHNICAL SPECIFICATIONS

### 2.1 Files to Modify

```
components/booking/AddressRequiredState.tsx     [CREATE]
components/booking/SlotPicker.tsx                [MODIFY]
app/book/laundry/page.tsx                        [MODIFY]
app/book/cleaning/page.tsx                       [MODIFY] (future)
```

### 2.2 Component Architecture

```
SlotPicker Component (Modified)
├── Always renders when date is provided
├── Shows AddressRequiredState when zip is null/empty
├── Shows existing slot UI when zip is provided
└── Maintains all existing functionality
```

---

## 3. IMPLEMENTATION INSTRUCTIONS

### STEP 1: Create AddressRequiredState Component

**File:** `components/booking/AddressRequiredState.tsx`

**Full Component Code:**

```tsx
'use client';

import { MapPin, ArrowUp } from 'lucide-react';

interface AddressRequiredStateProps {
  onAddressClick?: () => void;
  className?: string;
}

export function AddressRequiredState({ 
  onAddressClick,
  className = ''
}: AddressRequiredStateProps) {
  const handleClick = () => {
    if (onAddressClick) {
      onAddressClick();
      return;
    }
    
    // Default behavior: scroll to address field
    const addressSection = document.querySelector('[data-address-section]');
    if (addressSection) {
      addressSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Focus on the address input after scrolling
      setTimeout(() => {
        const addressInput = addressSection.querySelector('input');
        if (addressInput) {
          addressInput.focus();
        }
      }, 500);
    }
  };

  return (
    <div 
      className={`text-center py-12 px-4 bg-blue-50 border-2 border-blue-200 rounded-xl ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
        <MapPin className="w-8 h-8 text-blue-600" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Enter your address to view time slots
      </h3>
      
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
        We need your address to check service availability and show time slots for your area.
      </p>
      
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Scroll to address section and enter your address"
      >
        <ArrowUp className="w-4 h-4" aria-hidden="true" />
        Enter Address
      </button>
      
      <div className="mt-6 pt-6 border-t border-blue-200">
        <div className="flex items-start gap-2 text-left max-w-md mx-auto">
          <span className="text-lg flex-shrink-0" role="img" aria-label="Information">💡</span>
          <div className="text-xs text-gray-600">
            <strong>Why we need this:</strong> Your address helps us show accurate time slots and pricing for your location.
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key Features:**
- Informative blue color scheme (not error red)
- Icon + heading + description pattern
- Clear CTA button with icon
- Smooth scroll with auto-focus
- Accessibility attributes (role, aria-live, aria-label)
- Explanation of why address is needed
- Mobile-responsive padding and text sizing

---

### STEP 2: Modify SlotPicker Component

**File:** `components/booking/SlotPicker.tsx`

**Changes Required:**

#### 2A. Update Imports
```tsx
// Add at top of file
import { AddressRequiredState } from './AddressRequiredState';
```

#### 2B. Update Props Interface
```tsx
interface SlotPickerProps {
  zip: string; // Keep as string (will be empty string when not provided)
  value?: { date: string; slot?: BookingSlot };
  onChange: (value: { date: string; slot?: BookingSlot }) => void;
  onAddressRequired?: () => void; // NEW: Optional callback for scroll
}
```

#### 2C. Update Component Signature
```tsx
export default function SlotPicker({ 
  zip, 
  value, 
  onChange,
  onAddressRequired // NEW
}: SlotPickerProps) {
```

#### 2D. Add Address Check Logic

**CRITICAL: Insert this BEFORE the date selector, inside the main return statement:**

```tsx
export default function SlotPicker({ zip, value, onChange, onAddressRequired }: SlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState(value?.date || '');
  const [timePeriod, setTimePeriod] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  // Existing useSWR call - but only fetch if we have BOTH date AND zip
  const { data, error, isLoading } = useSWR(
    selectedDate && zip ? `/api/slots?service=LAUNDRY&zip=${zip}&date=${selectedDate}` : null,
    fetcher
  );

  // ... existing code ...

  return (
    <div className="space-y-4">
      {/* Date picker - always show */}
      <div>
        <label htmlFor="pickup-date" className="block text-sm font-medium text-gray-700 mb-2">
          Pickup Date
        </label>
        <input
          id="pickup-date"
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          min={getMinDate()}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-describedby="date-help"
          required
        />
        <p id="date-help" className="mt-1 text-xs text-gray-500">
          Closed on Sundays. Select tomorrow or later.
        </p>
      </div>

      {/* NEW: Show address required state if date selected but no zip */}
      {selectedDate && !zip && (
        <AddressRequiredState onAddressClick={onAddressRequired} />
      )}

      {/* Existing time slot UI - only show if we have BOTH date AND zip */}
      {selectedDate && zip && (
        <fieldset>
          {/* ... rest of existing slot picker code ... */}
        </fieldset>
      )}
    </div>
  );
}
```

**Important Notes:**
- The date picker ALWAYS shows (it's outside any conditional)
- The AddressRequiredState shows when `selectedDate && !zip`
- The slot list shows when `selectedDate && zip`
- This creates a progressive disclosure pattern

---

### STEP 3: Update Laundry Booking Page

**File:** `app/book/laundry/page.tsx`

**Changes Required:**

#### 3A. Add Data Attribute to Address Section

Find the address section (around line 850) and add `data-address-section`:

```tsx
{/* Address Section */}
<div className="card-standard card-padding" data-address-section>
  <div className="flex items-center justify-between mb-4">
    <h2 className="heading-section">📍 Pickup Address</h2>
    {/* ... rest of address section ... */}
  </div>
  {/* ... */}
</div>
```

#### 3B. Create Scroll Handler Function

Add this function inside `LaundryBookingForm` component (before the return statement):

```tsx
// Add this handler for scrolling to address section
const handleScrollToAddress = () => {
  const addressSection = document.querySelector('[data-address-section]');
  if (addressSection) {
    addressSection.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
    // Expand collapsed address if needed
    if (isAddressCollapsed) {
      setIsAddressCollapsed(false);
    }
    
    // Focus on address input after scrolling
    setTimeout(() => {
      const addressInput = document.querySelector('[data-address-input]');
      if (addressInput instanceof HTMLInputElement) {
        addressInput.focus();
      }
    }, 500);
  }
};
```

#### 3C. Add Data Attribute to Address Input

Find the AddressAutocomplete component and add a wrapper with data attribute:

```tsx
<div data-address-input>
  <AddressAutocomplete
    onAddressSelect={(addr) => {
      setAddress(addr)
      if (addr) {
        updatePersistedAddress({
          line1: addr.line1,
          line2: addressLine2,
          zip: addr.zip,
        })
      }
    }}
    onValidityChange={setIsAddressValid}
    defaultValue={address?.formatted}
    showLabel={false}
  />
</div>
```

#### 3D. Find the Schedule Section (Around Line 1200)

Replace the existing inline SlotPicker usage with:

**BEFORE (Current Code):**
```tsx
{date && address && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Available Time Slots
    </label>
    {/* ... slot rendering code ... */}
  </div>
)}
```

**AFTER (New Code):**
```tsx
{/* Always show SlotPicker when date is selected - it handles address requirement internally */}
{date && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Available Time Slots
    </label>
    
    {/* Show address required state or slots based on whether address exists */}
    {!address ? (
      <AddressRequiredState onAddressClick={handleScrollToAddress} />
    ) : loading ? (
      <p className="text-gray-500">Loading slots...</p>
    ) : availableSlots.length === 0 ? (
      <p className="text-red-600">No slots available. Please select a different date.</p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {availableSlots.map(slot => (
          {/* ... existing slot rendering ... */}
        ))}
      </div>
    )}
  </div>
)}
```

#### 3E. Add Import

At the top of the file:

```tsx
import { AddressRequiredState } from '@/components/booking/AddressRequiredState';
```

---

### STEP 4: Apply to Cleaning Booking Page (Future)

**File:** `app/book/cleaning/page.tsx`

Apply the same changes as Step 3 above:
1. Add `data-address-section` to address div
2. Add `handleScrollToAddress` function
3. Add `data-address-input` wrapper
4. Update slot picker conditional rendering
5. Add import for `AddressRequiredState`

---

## 4. TESTING REQUIREMENTS

### 4.1 Manual Testing Checklist

#### Test Case 1: Address Required State - Basic Display
**Steps:**
1. Navigate to `/book/laundry`
2. Select a pickup date
3. Do NOT enter an address

**Expected:**
- ✅ Date picker is visible
- ✅ "Enter your address to view time slots" message appears
- ✅ Blue informational styling (not error red)
- ✅ "Enter Address" button is visible
- ✅ Explanation text is visible
- ✅ No time slots are shown

#### Test Case 2: Scroll to Address Functionality
**Steps:**
1. Navigate to `/book/laundry`
2. Scroll down past the address section
3. Select a pickup date
4. Click "Enter Address" button

**Expected:**
- ✅ Page smoothly scrolls to address section
- ✅ Address input receives focus
- ✅ If address was collapsed, it expands
- ✅ No JavaScript errors in console

#### Test Case 3: Address Entry Flow
**Steps:**
1. Navigate to `/book/laundry`
2. Select a pickup date
3. See address required state
4. Enter an address
5. Observe the change

**Expected:**
- ✅ Address required state disappears
- ✅ Loading indicator appears briefly
- ✅ Time slots load and display
- ✅ No flash of unstyled content
- ✅ Smooth transition

#### Test Case 4: Collapsed Address Handling
**Steps:**
1. Navigate to `/book/laundry` as returning user
2. Address is pre-filled and collapsed
3. Click "Edit" on address
4. Clear the address
5. Select a date

**Expected:**
- ✅ Address required state appears
- ✅ "Enter Address" button works correctly
- ✅ Can re-enter address and continue

#### Test Case 5: Mobile Responsiveness
**Steps:**
1. Open `/book/laundry` on mobile device or mobile emulator
2. Select a date without address
3. Tap "Enter Address"

**Expected:**
- ✅ Layout looks good on mobile
- ✅ Touch targets are adequate (44x44px minimum)
- ✅ Scroll works smoothly on mobile
- ✅ Text is readable without zooming
- ✅ Button is easily tappable

#### Test Case 6: Accessibility
**Steps:**
1. Navigate to `/book/laundry`
2. Use keyboard only (Tab, Enter, Arrow keys)
3. Use screen reader (if available)

**Expected:**
- ✅ Can navigate to all elements with keyboard
- ✅ Focus indicators are visible
- ✅ Screen reader announces state changes
- ✅ Button has descriptive aria-label
- ✅ Status role with aria-live works
- ✅ No keyboard traps

#### Test Case 7: Edge Case - No Slots Available
**Steps:**
1. Navigate to `/book/laundry`
2. Enter a valid address
3. Select a date with no available slots

**Expected:**
- ✅ Shows "No slots available" message
- ✅ Does NOT show address required state
- ✅ Suggests alternative dates (if applicable)

#### Test Case 8: Form Validation
**Steps:**
1. Try to submit form with date but no address

**Expected:**
- ✅ Form does not submit
- ✅ Appropriate validation message appears
- ✅ User is guided to complete address

### 4.2 Automated Testing

**File:** `__tests__/booking-address-required.spec.tsx` (CREATE)

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressRequiredState } from '@/components/booking/AddressRequiredState';

describe('AddressRequiredState', () => {
  it('renders with correct messaging', () => {
    render(<AddressRequiredState />);
    
    expect(screen.getByText('Enter your address to view time slots')).toBeInTheDocument();
    expect(screen.getByText(/We need your address to check service availability/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter Address/i })).toBeInTheDocument();
  });

  it('calls onAddressClick when button is clicked', () => {
    const handleClick = jest.fn();
    render(<AddressRequiredState onAddressClick={handleClick} />);
    
    const button = screen.getByRole('button', { name: /Enter Address/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<AddressRequiredState />);
    
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-live', 'polite');
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  it('scrolls to address section when clicked without callback', () => {
    // Mock scrollIntoView
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    // Create a mock address section
    const mockSection = document.createElement('div');
    mockSection.setAttribute('data-address-section', '');
    document.body.appendChild(mockSection);
    
    render(<AddressRequiredState />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    });
    
    // Cleanup
    document.body.removeChild(mockSection);
  });
});
```

### 4.3 Browser Compatibility Testing

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

---

## 5. ACCEPTANCE CRITERIA

### Must Have (P0)
- [ ] AddressRequiredState component created and working
- [ ] Time slot section always visible when date is selected
- [ ] Clear messaging when address is missing
- [ ] "Enter Address" button scrolls to address field
- [ ] Address input receives focus after scroll
- [ ] No breaking changes to existing slot picker functionality
- [ ] Mobile responsive design
- [ ] All manual tests pass

### Should Have (P1)
- [ ] Smooth animations and transitions
- [ ] Proper keyboard navigation
- [ ] Screen reader compatibility
- [ ] Applied to both laundry and cleaning pages
- [ ] Automated tests written and passing

### Nice to Have (P2)
- [ ] Analytics tracking on button clicks
- [ ] A/B test infrastructure for messaging variants
- [ ] Suggested alternative dates when no slots available

---

## 6. EDGE CASES & ERROR HANDLING

### Edge Case 1: User Has Pre-filled Address (Returning Customer)
**Scenario:** User has address pre-filled from previous order  
**Expected Behavior:** Skip address required state, show slots immediately  
**Implementation:** Component checks for `zip` value before showing state

### Edge Case 2: Address is Collapsed
**Scenario:** Returning user has collapsed address section  
**Expected Behavior:** Clicking "Enter Address" expands the section  
**Implementation:** `handleScrollToAddress` sets `isAddressCollapsed(false)`

### Edge Case 3: Invalid/Partial Address
**Scenario:** User enters partial address (e.g., just street, no zip)  
**Expected Behavior:** Continue showing address required state until valid zip  
**Implementation:** Component checks specifically for `zip` value

### Edge Case 4: API Failure Loading Slots
**Scenario:** Address is valid but API fails to load slots  
**Expected Behavior:** Show error message, not address required state  
**Implementation:** Separate error handling in existing useSWR error state

### Edge Case 5: User Clears Address After Selecting Slot
**Scenario:** User has selected slot, then edits and clears address  
**Expected Behavior:** Slot selection cleared, show address required state  
**Implementation:** Conditional rendering checks for zip, useEffect clears slot when address changes

### Edge Case 6: Multiple Date Changes
**Scenario:** User changes date multiple times quickly  
**Expected Behavior:** Only one scroll animation, no race conditions  
**Implementation:** Debounce scroll handler if needed, or rely on browser's built-in debouncing

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Bundle Size
- Component adds ~1.5KB gzipped
- lucide-react icons already in bundle (MapPin, ArrowUp)
- No additional dependencies needed

### 7.2 Runtime Performance
- No expensive computations
- Scroll animation is browser-native (performant)
- No layout thrashing
- Component only renders when conditions met

### 7.3 API Calls
- **IMPORTANT:** useSWR call should NOT trigger when zip is empty
- Update SWR key to include zip check: `selectedDate && zip ? ... : null`
- This prevents unnecessary API calls when address is missing

---

## 8. ROLLBACK PLAN

### If Issues Arise:

#### Quick Rollback (5 minutes)
```bash
git revert <commit-hash>
git push
```

#### Partial Rollback (Keep Component, Remove Usage)
1. Comment out `AddressRequiredState` import in booking pages
2. Revert conditional rendering to original `{date && address && ...}`
3. Deploy

#### Feature Flag Approach (Recommended)
```tsx
// In SlotPicker.tsx
import { isFeatureEnabled } from '@/lib/features';

const showAddressRequiredState = isFeatureEnabled('address-required-state');

{selectedDate && !zip && showAddressRequiredState && (
  <AddressRequiredState onAddressClick={onAddressRequired} />
)}
```

---

## 9. DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests pass (manual + automated)
- [ ] Code review completed
- [ ] Design review completed
- [ ] Accessibility audit passed
- [ ] Browser compatibility verified
- [ ] Mobile testing completed
- [ ] Feature flag configured (if using)

### Deployment
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor error logs for 1 hour
- [ ] Check analytics for user behavior

### Post-Deployment
- [ ] Monitor booking completion rate
- [ ] Monitor support tickets for "no slots" issues
- [ ] Collect user feedback
- [ ] Check for any console errors
- [ ] Verify performance metrics unchanged

---

## 10. MONITORING & ANALYTICS

### Metrics to Track

#### Primary Metrics
- **Booking Completion Rate:** Should increase 15-25%
- **Time-to-First-Slot-View:** Should decrease 20-30%
- **Support Tickets:** "No slots showing" tickets should decrease 40%

#### Secondary Metrics
- **"Enter Address" Button Clicks:** Track engagement with new CTA
- **Address Field Completion Order:** % of users completing address before date
- **Form Abandonment Rate:** Should decrease at slot selection step

### Event Tracking (Google Analytics / Similar)

```typescript
// When AddressRequiredState is displayed
analytics.track('address_required_state_shown', {
  page: 'laundry_booking',
  date_selected: selectedDate,
});

// When "Enter Address" button is clicked  
analytics.track('address_required_button_clicked', {
  page: 'laundry_booking',
  scroll_target: 'address_section',
});

// When user completes address after seeing state
analytics.track('address_completed_after_prompt', {
  page: 'laundry_booking',
  time_to_complete: timeElapsed,
});
```

---

## 11. DOCUMENTATION UPDATES

### Files to Update

#### README.md
Add section about booking flow improvements

#### CHANGELOG.md
```markdown
## [Version X.X.X] - 2025-10-08

### Added
- Address required state in time slot picker for improved UX
- Smooth scroll to address section when prompted
- Clear messaging about why address is needed

### Changed
- Time slot section now always visible when date is selected
- Improved progressive disclosure in booking flow

### Fixed
- Users no longer confused when no time slots appear without address
```

#### Component Documentation
Create `components/booking/README.md`:
```markdown
# Booking Components

## AddressRequiredState

Shows informative message when user needs to enter address to view time slots.

### Usage
\`\`\`tsx
<AddressRequiredState 
  onAddressClick={() => scrollToAddress()}
/>
\`\`\`

### Props
- `onAddressClick?`: Optional callback when button clicked
- `className?`: Additional CSS classes

### Accessibility
- Uses `role="status"` with `aria-live="polite"`
- Button has descriptive `aria-label`
- Keyboard navigable
- Screen reader friendly
```

---

## 12. FUTURE ENHANCEMENTS

### Phase 2 (Future Sprint)
1. **Smart Address Suggestions**
   - Show popular neighborhoods
   - "Use current location" button
   - Remember last used addresses per user

2. **Slot Availability Preview**
   - Show count of available slots for each date in calendar
   - Highlight dates with high availability
   - Disable dates with no availability

3. **Progressive Enhancement**
   - Pre-load slots for tomorrow while user enters address
   - Show estimated availability before address completion
   - Optimize API calls with intelligent caching

4. **Personalization**
   - Remember user's preferred time slots
   - Show "Your usual time" badge
   - Suggest optimal pickup times based on order history

---

## 13. RISKS & MITIGATIONS

### Risk 1: Users Don't Click "Enter Address" Button
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:** 
- Make button highly visible with contrasting color
- Use action-oriented copy
- Consider auto-scroll after 3 seconds with animation

### Risk 2: Performance Degradation on Slow Devices
**Likelihood:** Low  
**Impact:** Low  
**Mitigation:**
- Test on low-end devices
- Use browser-native smooth scroll (hardware accelerated)
- Keep component lightweight

### Risk 3: Breaking Changes in Existing Flow
**Likelihood:** Low  
**Impact:** High  
**Mitigation:**
- Thorough testing of all booking scenarios
- Feature flag for quick disable if needed
- Staged rollout (10% → 50% → 100%)

### Risk 4: Accessibility Issues Not Caught
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:**
- Use automated accessibility testing tools
- Manual testing with screen readers
- Follow WCAG 2.1 AA guidelines strictly

---

## 14. IMPLEMENTATION SUMMARY

### What Gets Created
1. **New Component:** `components/booking/AddressRequiredState.tsx` (~80 lines)
2. **New Test:** `__tests__/booking-address-required.spec.tsx` (~60 lines)

### What Gets Modified
1. **SlotPicker Component:** Add address check logic (~15 lines)
2. **Laundry Booking Page:** Add scroll handler and data attributes (~30 lines)
3. **Cleaning Booking Page:** Same changes as laundry page (~30 lines)

### Total Lines of Code
- **Added:** ~200 lines
- **Modified:** ~75 lines
- **Deleted:** ~10 lines (old conditional rendering)

### Estimated Effort Breakdown
- **Component Creation:** 1 hour
- **SlotPicker Integration:** 1 hour  
- **Booking Page Updates:** 2 hours
- **Testing:** 1.5 hours
- **Documentation:** 0.5 hours
- **Buffer:** 0.5 hours
- **Total:** 6.5 hours

---

## 15. SIGN-OFF CHECKLIST

Before marking this as complete:

- [ ] All code written and tested locally
- [ ] All acceptance criteria met
- [ ] Manual testing checklist completed
- [ ] Automated tests written and passing
- [ ] Code review completed
- [ ] Design review completed
- [ ] Accessibility audit passed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Stakeholder approval received
- [ ] Deployed to production
- [ ] Monitoring dashboard configured
- [ ] Team notified of deployment

---

## APPENDIX A: CODE SNIPPETS REFERENCE

### Complete SlotPicker.tsx Changes

The key change is in the return statement:

```tsx
return (
  <div className="space-y-4">
    {/* Date picker - ALWAYS show */}
    <div>
      <label htmlFor="pickup-date">Pickup Date</label>
      <input
        id="pickup-date"
        type="date"
        value={selectedDate}
        onChange={(e) => handleDateChange(e.target.value)}
        min={getMinDate()}
        className="input-field"
        required
      />
    </div>

    {/* NEW: Address required state */}
    {selectedDate && !zip && (
      <AddressRequiredState onAddressClick={onAddressRequired} />
    )}

    {/* Existing: Time slots */}
    {selectedDate && zip && (
      <fieldset>
        <legend>Available Time Slots</legend>
        {/* ... existing slot rendering code ... */}
      </fieldset>
    )}
  </div>
);
```

### Complete handleScrollToAddress Function

```tsx
const handleScrollToAddress = () => {
  const addressSection = document.querySelector('[data-address-section]');
  if (addressSection) {
    // Scroll to section
    addressSection.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
    // Expand if collapsed
    if (isAddressCollapsed) {
      setIsAddressCollapsed(false);
    }
    
    // Focus input after scroll completes
    setTimeout(() => {
      const addressInput = document.querySelector('[data-address-input] input');
      if (addressInput instanceof HTMLInputElement) {
        addressInput.focus();
      }
    }, 500);
  }
};
```

---

## APPENDIX B: DESIGN TOKENS

Use these consistent values:

```tsx
// Colors
const colors = {
  background: 'bg-blue-50',
  border: 'border-blue-200',
  iconBg: 'bg-blue-100',
  iconColor: 'text-blue-600',
  buttonBg: 'bg-blue-600',
  buttonHover: 'hover:bg-blue-700',
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
};

// Spacing
const spacing = {
  padding: 'py-12 px-4',
  iconSize: 'w-16 h-16',
  iconInnerSize: 'w-8 h-8',
  buttonPadding: 'px-6 py-3',
};

// Border Radius
const borderRadius = {
  container: 'rounded-xl',
