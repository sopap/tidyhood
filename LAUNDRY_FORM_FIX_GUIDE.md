# Laundry Form Fix Guide

## Status
The laundry booking form is partially fixed. To complete it, copy the structure from `app/book/cleaning/page.tsx` with these changes:

## Required Changes

### 1. Update SavedBookingData interface
```typescript
interface SavedBookingData {
  formData: {
    zip: string
    pounds: number  // Changed from bedrooms/bathrooms
    addons: string[]
    date: string
    addressLine1: string
    addressLine2: string
    city: string
    phone: string
    specialInstructions: string
  }
  // ... rest is same
}
```

### 2. Update formData state
```typescript
const [formData, setFormData] = useState({
  zip: '',
  pounds: 15,  // Changed from bedrooms/bathrooms
  addons: [] as string[],
  date: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  phone: '',
  specialInstructions: ''
})
```

### 3. Update addons
```typescript
const addons = [
  { id: 'LND_RUSH_24HR', name: 'Rush Service (24hr)', price: 10 },
  { id: 'LND_DELICATE', name: 'Delicate Care', price: 5 },
  { id: 'LND_EXTRA_SOFTENER', name: 'Extra Softener', price: 3 },
]
```

### 4. Update Step 1 form fields
Replace bedrooms/bathrooms/deep with:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Weight (lbs) - Minimum 15 lbs
  </label>
  <input
    type="number"
    value={formData.pounds}
    onChange={(e) => setFormData({...formData, pounds: parseInt(e.target.value)})}
    min="15"
    max="100"
    className="input-field"
    required
  />
  <p className="mt-2 text-sm text-gray-500">
    Estimate: Small load ~15 lbs, Medium ~25 lbs, Large ~35 lbs
  </p>
</div>
```

### 5. Update handleSubmit
```typescript
const requestBody = {
  service_type: 'LAUNDRY',
  slot: {
    partner_id: selectedSlot.partner_id,
    slot_start: selectedSlot.slot_start,
    slot_end: selectedSlot.slot_end
  },
  address: {
    line1: formData.addressLine1,
    line2: formData.addressLine2 || undefined,
    city: formData.city,
    zip: formData.zip,
    notes: formData.specialInstructions || undefined
  },
  details: {
    lbs: formData.pounds,  // Changed from bedrooms/bathrooms
    addons: formData.addons
  }
}
```

### 6. Update sessionStorage key
Change 'pending-cleaning-order' to 'pending-laundry-order'

### 7. Update all text references
- "Cleaning" → "Laundry"
- "cleaning" → "laundry"  
- "CLEANING" → "LAUNDRY"

## Quick Method
1. Copy `app/book/cleaning/page.tsx` to a temp file
2. Find/replace all cleaning references with laundry
3. Make the field changes above
4. Replace `app/book/laundry/page.tsx` with the result

## Test Checklist
- [ ] Can select service details (weight, addons)
- [ ] Can fetch and select real time slots
- [ ] Can enter structured address
- [ ] Authentication check works
- [ ] Data preserves through login
- [ ] Order submits successfully
