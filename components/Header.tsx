'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Smart navigation: logged in users go to orders, others to home
    router.push(user ? '/orders' : '/')
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <header className="container mx-auto px-4 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <Link 
          href={user ? '/orders' : '/'}
          onClick={handleLogoClick}
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/logo.svg"
            alt="Tidyhood"
            width={300}
            height={75}
            priority
            className="h-12 md:h-14 lg:h-16 w-auto"
          />
        </Link>
        <nav className="space-x-4">
          {user ? (
            // Logged in navigation
            <>
              <Link href="/orders" className="text-text-secondary hover:text-primary-600">
                My Orders
              </Link>
              <button 
                onClick={handleLogout}
                className="text-text-secondary hover:text-primary-600"
              >
                Logout
              </button>
            </>
          ) : (
            // Logged out navigation
            <>
              <Link href="/login" className="text-text-secondary hover:text-primary-600">
                Login
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
