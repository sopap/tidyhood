export type OrderStep = 'pickup' | 'facility' | 'quote' | 'processing' | 'completed';

export const ORDER_STEPS: { key: OrderStep; label: string; icon: string }[] = [
  { key: 'pickup',     label: 'Pickup Scheduled', icon: '📅' },
  { key: 'facility',   label: 'Picked Up',        icon: '🧺' },
  { key: 'quote',      label: 'Quote Sent',       icon: '💬' },
  { key: 'processing', label: 'Processing',       icon: '🧼' },
  { key: 'completed',  label: 'Completed',        icon: '✅' },
];

// Map database statuses to our step system
export function mapDatabaseStatus(dbStatus: string): OrderStep {
  const normalized = dbStatus.toLowerCase();
  const map: Record<string, OrderStep> = {
    'pending_pickup': 'pickup',
    'pending': 'pickup',
    'at_facility': 'facility',
    'awaiting_payment': 'quote',
    'paid': 'processing',
    'paid_processing': 'processing',
    'completed': 'completed',
  };
  return map[normalized] || 'pickup';
}

export function stepIndex(s: OrderStep) {
  return ORDER_STEPS.findIndex(x => x.key === s);
}

export function statusTone(step: OrderStep): 'blue' | 'indigo' | 'green' | 'gray' {
  if (step === 'completed') return 'green';
  if (step === 'processing') return 'indigo';
  if (step === 'pickup' || step === 'facility' || step === 'quote') return 'blue';
  return 'gray';
}

export function getStatusLabel(dbStatus: string): string {
  const step = mapDatabaseStatus(dbStatus);
  return ORDER_STEPS.find(s => s.key === step)?.label || 'Pending';
}
