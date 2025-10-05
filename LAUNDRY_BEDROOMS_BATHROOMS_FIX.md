# Laundry Form Fix - Remove Bedrooms/Bathrooms Fields

## Issue
Bedrooms and Bathrooms fields were incorrectly appearing on the `/book/laundry` page. These fields are only relevant for cleaning services, not laundry services.

## Changes Made

### File: `app/book/laundry/page.tsx`

#### Removed State Variables
- Removed `bedrooms` state variable (previously defaulting to 1)
- Removed `bathrooms` state variable (previously defaulting to 1)

#### Removed Hydration Logic
- Removed useEffect dependency on `persistedHomeSize`
- Removed logic that populated bedrooms/bathrooms from persisted data

#### Removed UI Section
- Removed entire "Home Size - New Fields" section containing:
  - Bedrooms dropdown (Studio to 5+ BR)
  - Bathrooms dropdown (1 BA to 4+ BA)

#### Updated Form Submission
- Removed `bedrooms` and `bathrooms` from order details payload
- These fields are no longer sent to the API when creating laundry orders

#### Updated Clear Function
- Removed bedrooms/bathrooms reset from the "Not you? Clear saved details" button

## Testing
✅ Verified on `/book/laundry` that:
- Contact Information section no longer shows Bedrooms/Bathrooms fields
- Form only shows: Phone Number, Remember checkbox, and Pickup Notes
- Page loads without errors
- Form structure is clean and logical

## Impact
- Improves user experience by removing confusing/irrelevant fields
- Reduces form complexity for laundry bookings
- Maintains data integrity (no unnecessary fields in order payload)

## Status
✅ Implemented
✅ Tested
✅ Ready for production
