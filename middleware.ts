/**
 * Next.js Middleware
 * 
 * Runs on every request before the route handler.
 * 
 * Responsibilities:
 * - Add security headers (CSP, HSTS, etc.)
 * - Generate and inject correlation IDs for request tracing
 * - Rate limiting (if needed at edge)
 * 
 * Security Headers Added:
 * - Content-Security-Policy: Prevents XSS attacks
 * - Strict-Transport-Security: Enforce HTTPS
 * - X-Frame-Options: Prevent clickjacking
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - Referrer-Policy: Control referrer information
 * - Permissions-Policy: Control browser features
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Generate correlation ID for request tracing
  const correlationId = crypto.randomUUID()
  
  // Clone response and add headers
  const response = NextResponse.next()
  
  // Add correlation ID to response headers
  response.headers.set('X-Correlation-ID', correlationId)
  
  // Add correlation ID to request headers for use in route handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-correlation-id', correlationId)
  
  // Security Headers
  
  // Content Security Policy - Strict policy with Next.js support
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com;
    frame-src 'self' https://js.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()
  
  response.headers.set('Content-Security-Policy', cspHeader)
  
  // Strict Transport Security - Force HTTPS for 2 years
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy - Disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  
  // Remove powered-by header
  response.headers.delete('X-Powered-By')
  
  return response
}

/**
 * Matcher config - which routes this middleware runs on
 * Excludes static files and API routes that need different CSP
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (static files)
     * - images in public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
