import { redirect } from 'next/navigation'
import { getServiceClient } from '@/lib/db'
import AdminNav from '@/components/admin/AdminNav'

interface WaitlistEntry {
  id: string
  email: string
  zip_code: string
  service_interest: 'laundry' | 'cleaning' | 'both'
  message: string | null
  device_type: string | null
  referrer: string | null
  created_at: string
}

async function getWaitlistData() {
  const supabase = getServiceClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/orders')
  }

  // Fetch waitlist entries
  const { data: entries, error } = await supabase
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching waitlist:', error)
    return { entries: [], userEmail: profile.email }
  }

  return { entries: entries as WaitlistEntry[], userEmail: profile.email }
}

function getServiceInterestBadge(interest: string) {
  const styles = {
    laundry: 'bg-blue-100 text-blue-800',
    cleaning: 'bg-green-100 text-green-800',
    both: 'bg-purple-100 text-purple-800'
  }
  return styles[interest as keyof typeof styles] || 'bg-gray-100 text-gray-800'
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default async function AdminWaitlistPage() {
  const { entries, userEmail } = await getWaitlistData()

  // Group entries by ZIP code for analysis
  const zipCodeStats = entries.reduce((acc, entry) => {
    if (!acc[entry.zip_code]) {
      acc[entry.zip_code] = { count: 0, services: { laundry: 0, cleaning: 0, both: 0 } }
    }
    acc[entry.zip_code].count++
    acc[entry.zip_code].services[entry.service_interest]++
    return acc
  }, {} as Record<string, { count: number; services: { laundry: number; cleaning: number; both: number } }>)

  const topZipCodes = Object.entries(zipCodeStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav userEmail={userEmail} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Waitlist</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage service area expansion requests
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Signups</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{entries.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Laundry Interest</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {entries.filter(e => e.service_interest === 'laundry' || e.service_interest === 'both').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Cleaning Interest</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {entries.filter(e => e.service_interest === 'cleaning' || e.service_interest === 'both').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Unique ZIP Codes</div>
            <div className="mt-2 text-3xl font-bold text-purple-600">
              {Object.keys(zipCodeStats).length}
            </div>
          </div>
        </div>

        {/* Top ZIP Codes */}
        {topZipCodes.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top ZIP Codes by Demand</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ZIP Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Requests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Laundry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cleaning
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Both
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topZipCodes.map(([zipCode, stats]) => (
                    <tr key={zipCode}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {zipCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {stats.services.laundry}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {stats.services.cleaning}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {stats.services.both}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Entries */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Entries</h2>
          </div>
          <div className="overflow-x-auto">
            {entries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No waitlist entries yet</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ZIP Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Interest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.zip_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getServiceInterestBadge(entry.service_interest)}`}>
                          {entry.service_interest}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {entry.message || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.device_type || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Export note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>To export this data, you can query the <code className="bg-gray-100 px-2 py-1 rounded">waitlist</code> table directly in your database.</p>
        </div>
      </main>
    </div>
  )
}
