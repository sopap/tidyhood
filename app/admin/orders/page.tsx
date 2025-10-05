import Link from 'next/link'

export default function AdminOrders() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="flex space-x-2">
          <input
            type="search"
            placeholder="Search orders..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>All Status</option>
            <option>Scheduled</option>
            <option>Picked Up</option>
            <option>Processing</option>
            <option>Delivered</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Order management interface coming soon.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This page will display all orders with filtering, sorting, and bulk actions.
          </p>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            In the meantime, you can view orders at:
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Customer Orders Page
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Coming Soon:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Filter orders by status, service type, partner, date range</li>
          <li>• Search by order ID, customer name, phone</li>
          <li>• Bulk actions (assign, cancel, export)</li>
          <li>• Status badges with color coding</li>
          <li>• Quick actions per row (view, assign, cancel, refund)</li>
          <li>• Real-time updates every 30 seconds</li>
        </ul>
      </div>
    </div>
  )
}
