// Sample dry-clean pricing for informational purposes
// Final prices vary by fabric, embellishments, and condition

export interface DryItemPrice {
  key: string;
  label: string;
  approx: string; // display-friendly "~$12" or "$30+"
  note?: string;  // optional badges (e.g., "silk", "leather")
}

export const DRY_CLEAN_PRICE_SAMPLES: DryItemPrice[] = [
  { key: 'shirt', label: 'Shirt / Blouse', approx: '~$11' },
  { key: 'pants', label: 'Pants / Slacks', approx: '~$13' },
  { key: 'skirt', label: 'Skirt', approx: '~$10' },
  { key: 'sweater', label: 'Sweater / Knit', approx: '~$15' },
  { key: 'suit2', label: 'Suit (2-piece)', approx: '~$20' },
  { key: 'suit3', label: 'Suit (3-piece)', approx: '~$29' },
  { key: 'jacket', label: 'Jacket / Blazer', approx: '~$12' },
  { key: 'dress', label: 'Dress (standard)', approx: '$18–$25' },
  { key: 'tie', label: 'Tie', approx: '~$9' },
  { key: 'coat', label: 'Coat / Outer Jacket', approx: '$30+' },
  { key: 'downCoat', label: 'Down Coat', approx: '$40+', note: 'down' },
  { key: 'gown', label: 'Gown / Formal', approx: '$26+' },
  { key: 'silkBlouse', label: 'Silk Blouse', approx: '~$15', note: 'silk' },
  { key: 'leather', label: 'Leather / Suede', approx: '$65+', note: 'specialty' },
  { key: 'scarf', label: 'Scarf', approx: '~$8' },
];

export const DRY_CLEAN_DISCLAIMER = 
  "These are starting estimates. Final prices vary by fabric, embellishments, and condition. You'll receive a detailed quote after inspection.";
