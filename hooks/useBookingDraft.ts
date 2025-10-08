'use client';

import { useEffect, useState } from 'react';

/**
 * Booking Draft Storage
 * 
 * Stores complete booking form state in localStorage with 24-hour expiry.
 * Used to preserve form data when unauthenticated users are redirected to login.
 */

interface TimeSlot {
  partner_id: string
  slot_start: string
  slot_end: string
}

interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  formatted: string
}

interface LaundryDetails {
  serviceType: 'washFold' | 'dryClean' | 'mixed'
  weightTier?: 'small' | 'medium' | 'large'
  estimatedPounds?: number
  rushService: boolean
  deliveryDate?: string
  deliverySlot?: TimeSlot
}

interface CleaningDetails {
  bedrooms: number
  bathrooms: number
  cleaningType: 'standard' | 'deep' | 'moveOut'
  addons: Record<string, boolean>
  frequency?: string
  firstVisitDeep?: boolean
}

export interface BookingDraft {
  serviceType: 'LAUNDRY' | 'CLEANING'
  timestamp: number
  
  // Shared fields
  phone: string
  address?: Address  // Optional - user may not have filled this yet
  specialInstructions?: string
  pickupDate: string
  pickupSlot?: TimeSlot
  
  // Service-specific fields
  laundry?: LaundryDetails
  cleaning?: CleaningDetails
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get localStorage key for the specified service type
 */
function getKey(serviceType: 'LAUNDRY' | 'CLEANING'): string {
  return `booking-draft-${serviceType.toLowerCase()}`;
}

/**
 * Read draft from localStorage
 * Returns null if expired, invalid, or doesn't exist
 */
function readDraft(serviceType: 'LAUNDRY' | 'CLEANING'): BookingDraft | null {
  try {
    const raw = localStorage.getItem(getKey(serviceType));
    if (!raw) return null;
    
    const data = JSON.parse(raw) as BookingDraft;
    
    // Check service type matches
    if (data.serviceType !== serviceType) return null;
    
    // Check expiration (24 hours)
    if (Date.now() - (data.timestamp || 0) > TTL_MS) {
      localStorage.removeItem(getKey(serviceType));
      return null;
    }
    
    return data;
  } catch {
    // Silently fail on errors (localStorage disabled, JSON parse error, etc.)
    return null;
  }
}

/**
 * Write draft to localStorage
 */
function writeDraft(serviceType: 'LAUNDRY' | 'CLEANING', data: BookingDraft): void {
  try {
    // Ensure timestamp is set
    data.timestamp = Date.now();
    data.serviceType = serviceType;
    
    localStorage.setItem(getKey(serviceType), JSON.stringify(data));
  } catch {
    // Silently fail if localStorage is unavailable or quota exceeded
  }
}

/**
 * Clear draft from localStorage
 */
function clearDraft(serviceType: 'LAUNDRY' | 'CLEANING'): void {
  try {
    localStorage.removeItem(getKey(serviceType));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Hook for managing booking drafts
 * 
 * Provides methods to save, restore, and clear booking form state
 * for unauthenticated users redirected to login.
 */
export function useBookingDraft(serviceType: 'LAUNDRY' | 'CLEANING') {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const existingDraft = readDraft(serviceType);
    setDraft(existingDraft);
    setLoaded(true);
  }, [serviceType]);

  /**
   * Save draft to localStorage
   */
  const saveDraft = (data: BookingDraft) => {
    writeDraft(serviceType, data);
    setDraft(data);
  };

  /**
   * Restore draft from localStorage
   * Returns null if no valid draft exists
   */
  const restoreDraft = (): BookingDraft | null => {
    const existingDraft = readDraft(serviceType);
    setDraft(existingDraft);
    return existingDraft;
  };

  /**
   * Clear draft from localStorage
   */
  const clearDraftFn = () => {
    clearDraft(serviceType);
    setDraft(null);
  };

  return {
    draft,
    loaded,
    saveDraft,
    restoreDraft,
    clearDraft: clearDraftFn,
    hasDraft: draft !== null,
  };
}
