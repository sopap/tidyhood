import { CleaningAddon } from './types';

export const CLEANING_ADDONS: CleaningAddon[] = [
  // Core add-ons (always available)
  { 
    key: 'laundryPickup', 
    label: 'Laundry Pickup during Cleaning', 
    price: 30, 
    category: 'core' 
  },
  { 
    key: 'petHair', 
    label: 'Pet Hair & Odor Removal', 
    price: 25, 
    category: 'core' 
  },
  { 
    key: 'insideCabinets', 
    label: 'Inside Cabinets / Closets', 
    price: 25, 
    category: 'core' 
  },
  { 
    key: 'windows', 
    label: 'Interior Windows & Blinds', 
    price: 30, 
    category: 'core' 
  },

  // Premium add-ons
  { 
    key: 'ecoProducts', 
    label: 'Eco / Green Products', 
    price: undefined, // handled as percentage or TBD
    category: 'premium' 
  },
  { 
    key: 'sanitization', 
    label: 'Sanitization / Disinfection', 
    price: 50, 
    category: 'premium' 
  },

  // Move-out specific add-ons
  { 
    key: 'fridgeOvenBundle', 
    label: 'Fridge + Oven Interior (bundle)', 
    price: 40, 
    category: 'moveOut',
    showIf: ({ type }) => type === 'moveOut'
  },
  { 
    key: 'wallWipe', 
    label: 'Wall Wipe & Spot Removal', 
    price: 20, 
    category: 'moveOut',
    showIf: ({ type }) => type === 'moveOut'
  },
  { 
    key: 'junkQuote', 
    label: 'Junk / Dumpster Pickup (quote)', 
    price: undefined, // TBD - requires quote
    category: 'moveOut',
    showIf: ({ type }) => type === 'moveOut'
  },
];
