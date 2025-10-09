import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AdminNav from '@/components/admin/AdminNav'

export const metadata = {
  title: 'Admin Dashboard | TidyHood',
  description: 'TidyHood admin dashboard for managing orders and partners',
}

async function AdminAuth() {
  const user = await getCurrentUser()
  
  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login?message=Please log in to access the admin dashboard&redirect=/admin')
  }
  
  // Redirect to orders if not admin
  if (user.role !== 'admin') {
    redirect('/orders?message=You do not have admin access')
  }
  
  return user
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await AdminAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav userEmail={user.email || 'Admin'} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
