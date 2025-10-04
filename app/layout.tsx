import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tidyhood - Harlem Laundry & Home Cleaning',
  description: 'Professional laundry and home cleaning services in Harlem',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
