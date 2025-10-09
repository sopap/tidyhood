export default function ServiceAddressCard({ 
  serviceType, 
  weightLabel, 
  addressLines,
  phone
}: {
  serviceType: string;
  weightLabel?: string;
  addressLines: string[];
  phone?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <h3 className="text-sm font-bold text-gray-900">Service Details</h3>
          </div>
          <div className="text-base font-semibold text-gray-900">{serviceType}</div>
          {weightLabel && (
            <div className="text-sm text-gray-600 mt-2 flex items-center gap-1">
              <span>📊</span>
              {weightLabel}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📍</span>
            <h3 className="text-sm font-bold text-gray-900">Service Address</h3>
          </div>
          <address className="not-italic text-sm text-gray-800 space-y-1 leading-relaxed">
            {addressLines.map((l, i) => (
              <div key={i} className={i === 0 ? 'font-semibold text-gray-900' : ''}>{l}</div>
            ))}
          </address>
          {phone && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <span>📱</span>
                <a href={`tel:${phone}`} className="text-brand hover:text-brand-700 font-medium">
                  {phone}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
