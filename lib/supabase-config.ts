/**
 * Single source for Supabase connection config.
 *
 * NEXT_PUBLIC_* values are inlined at build time by Next.js, so this works
 * in both server and client contexts. Fails loudly if missing — never
 * fall back to hardcoded credentials.
 */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set them in .env.local (dev) or the Vercel dashboard (prod).'
    )
  }

  return { url, anonKey }
}
