import InlineNote from './InlineNote';

export default function PricingCard({ 
  rows, 
  totalCents, 
  note 
}: {
  rows: Array<{ label: string; amountCents: number }>;
  totalCents: number;
  note?: string;
}) {
  const money = (c: number) => (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="space-y-2 text-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-none last:pb-0">
            <span className="text-gray-700">{r.label}</span>
            <span className="font-medium text-gray-900">{money(r.amountCents)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-base font-semibold border-t pt-3">
        <span className="text-gray-900">Total</span>
        <span className="text-gray-900">{money(totalCents)}</span>
      </div>
      {note && <InlineNote className="mt-3" text={note} />}
    </div>
  );
}
