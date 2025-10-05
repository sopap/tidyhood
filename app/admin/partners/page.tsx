export default function AdminPartners() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Add Partner
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Partner management interface coming soon.
          </p>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Coming Soon:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• View all partners (active, pending, inactive)</li>
              <li>• Partner profile with performance metrics</li>
              <li>• Add/edit partner information</li>
              <li>• Upload COI documents</li>
              <li>• Configure service areas and payout rates</li>
              <li>• View partner order history and earnings</li>
              <li>• Activate/deactivate partners</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
