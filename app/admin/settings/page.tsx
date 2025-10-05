export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Platform settings interface coming soon.
          </p>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Coming Soon:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Business rules (first order cap, quote expiry, cancellation window)</li>
              <li>• Pricing configuration (base rates, minimums, tax rates)</li>
              <li>• Service areas (ZIP codes)</li>
              <li>• Notification settings (SMS, email, admin alerts)</li>
              <li>• System settings (maintenance mode, new order acceptance)</li>
              <li>• Feature flags</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
