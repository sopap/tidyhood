/**
 * Single source of truth for TidyHood's service area.
 *
 * All ZIP validation, marketing copy, metadata, and JSON-LD should read from
 * this module. NEXT_PUBLIC_ALLOWED_ZIPS (env) overrides the default list so
 * the area can be adjusted without a code change; when unset, the full
 * Manhattan list below applies.
 */

/** All Manhattan residential ZIP codes. */
export const MANHATTAN_ZIPS: string[] = [
  // Downtown / Midtown / Uptown core
  '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10009',
  '10010', '10011', '10012', '10013', '10014', '10016', '10017', '10018',
  '10019', '10021', '10022', '10023', '10024', '10025', '10026', '10027',
  '10028', '10029', '10030', '10031', '10032', '10033', '10034', '10035',
  '10036', '10037', '10038', '10039', '10040',
  // Roosevelt Island, UES/UWS infill, Battery Park City
  '10044', '10065', '10069', '10075', '10128', '10280', '10282',
]

/** ZIPs where TidyHood started — used for "born in Harlem" copy. */
export const HARLEM_ZIPS: string[] = [
  '10025', '10026', '10027', '10029', '10030', '10031', '10032',
  '10035', '10037', '10039',
]

/** Active service area: env override or all of Manhattan. */
export function getAllowedZips(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',')
    .map((z) => z.trim())
    .filter((z) => /^\d{5}$/.test(z))
  return fromEnv && fromEnv.length > 0 ? fromEnv : MANHATTAN_ZIPS
}

export function isZipAllowed(zip: string): boolean {
  return getAllowedZips().includes(zip.trim())
}

/** Short human label for the service area, for hero/meta copy. */
export const SERVICE_AREA_LABEL = 'all of Manhattan'

/** Neighborhood groupings for the service-areas page. */
export const NEIGHBORHOODS: { name: string; zips: string[] }[] = [
  { name: 'Harlem (where we started)', zips: ['10026', '10027', '10030', '10037', '10039'] },
  { name: 'East Harlem', zips: ['10029', '10035'] },
  { name: 'Hamilton Heights & Washington Heights', zips: ['10031', '10032', '10033', '10040'] },
  { name: 'Inwood', zips: ['10034'] },
  { name: 'Morningside Heights & Upper West Side', zips: ['10025', '10024', '10023', '10069'] },
  { name: 'Upper East Side & Yorkville', zips: ['10021', '10028', '10065', '10075', '10128'] },
  { name: 'Midtown & Hell’s Kitchen', zips: ['10016', '10017', '10018', '10019', '10022', '10036'] },
  { name: 'Chelsea, Flatiron & Gramercy', zips: ['10001', '10010', '10011'] },
  { name: 'Greenwich Village, East Village & SoHo', zips: ['10003', '10009', '10012', '10014'] },
  { name: 'Lower East Side & Chinatown', zips: ['10002', '10013', '10038'] },
  { name: 'Financial District & Battery Park City', zips: ['10004', '10005', '10006', '10007', '10280', '10282'] },
  { name: 'Roosevelt Island', zips: ['10044'] },
]
