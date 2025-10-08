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
    // Logo always takes users to landing page
    router.push('/')
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <header className="container mx-auto px-4 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <Link 
          href="/"
          onClick={handleLogoClick}
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/logo.svg"
            alt="TidyHood"
            width={420}
            height={105}
            priority
            className="h-16 md:h-[67px] lg:h-[77px] w-auto"
          />
        </Link>
        <nav className="space-x-6">
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
