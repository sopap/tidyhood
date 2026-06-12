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
        <nav className="flex items-center gap-4 md:gap-6">
          {/* Service links — desktop only to keep mobile uncluttered */}
          <Link href="/laundry" className="hidden md:inline text-text-secondary hover:text-primary-600">
            Laundry
          </Link>
          <Link href="/cleaning" className="hidden md:inline text-text-secondary hover:text-primary-600">
            Cleaning
          </Link>
          {user ? (
            <>
              <Link href="/orders" className="text-text-secondary hover:text-primary-600">
                My Orders
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:inline text-text-secondary hover:text-primary-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="text-text-secondary hover:text-primary-600">
              Login
            </Link>
          )}
          {/* Primary conversion CTA — always visible */}
          <Link href="/book/laundry" className="btn-primary whitespace-nowrap" aria-label="Book a pickup">
            Book Now
          </Link>
        </nav>
      </div>
    </header>
  )
}
