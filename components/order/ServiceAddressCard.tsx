export default function ServiceAddressCard({ 
  serviceType, 
  weightLabel, 
  addressLines 
}: {
  serviceType: string;
  weightLabel?: string;
  addressLines: string[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold text-gray-900 mb-1">Service</div>
          <div className="text-sm text-gray-800">{serviceType}</div>
          {weightLabel && <div className="text-sm text-gray-600 mt-0.5">{weightLabel}</div>}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 mb-1">Address</div>
          <div className="text-sm text-gray-800 space-y-0.5">
            {addressLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
