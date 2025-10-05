/**
 * Persistent Booking Storage
 * 
 * Stores user booking details in localStorage with versioning and TTL.
 * Fields: phone, address (line1, line2, zip), homeSize (bedrooms, bathrooms)
 */

export type PersistedBooking = {
  v: 1;
  ts: number; // Date.now()
  remember: boolean;
  phone?: string; // E.164 or digits only
  address?: {
    line1?: string;
    line2?: string;
    zip?: string;
  };
  homeSize?: {
    bedrooms?: number;
    bathrooms?: number;
  };
};

const KEY = 'tidyhood.booking.v1';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Read persisted booking data from localStorage
 * Returns null if data is expired, invalid, or doesn't exist
 */
export function readPersisted(): PersistedBooking | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    
    const data = JSON.parse(raw) as PersistedBooking;
    
    // Check version
    if (data.v !== 1) return null;
    
    // Check expiration
    if (Date.now() - (data.ts || 0) > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Write persisted booking data to localStorage
 * Respects the remember flag - won't write if remember is false
 */
export function writePersisted(updater: (prev: PersistedBooking) => PersistedBooking): void {
  try {
    const prev = readPersisted() ?? {
      v: 1,
      ts: Date.now(),
      remember: true,
    };
    
    const next = updater(prev);
    
    // Don't write if remember is off
    if (!next.remember) return;
    
    // Ensure version and timestamp are set
    next.v = 1;
    next.ts = Date.now();
    
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clear all persisted booking data
 */
export function clearPersisted(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
