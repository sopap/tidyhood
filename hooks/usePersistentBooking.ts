'use client';

import * as React from 'react';
import { readPersisted, writePersisted, clearPersisted, type PersistedBooking } from '@/lib/persist';
import { debounce } from '@/lib/debounce';

/**
 * Normalize phone number to digits only
 */
function normalizePhone(input: string): string {
  const digits = (input || '').replace(/\D/g, '');
  return digits;
}

/**
 * Format phone number for display: (XXX) XXX-XXXX
 */
export function formatPhone(digits: string): string {
  const d = (digits || '').replace(/\D/g, '');
  if (d.length === 0) return '';
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

/**
 * Hook for managing persistent booking data
 * 
 * Provides state for phone, address, and home size with automatic
 * localStorage persistence, debouncing, and expiration handling.
 */
export function usePersistentBooking() {
  const [loaded, setLoaded] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState<{
    line1?: string;
    line2?: string;
    zip?: string;
  }>({});
  const [homeSize, setHomeSize] = React.useState<{
    bedrooms?: number;
    bathrooms?: number;
  }>({});
  const [prefillMsg, setPrefillMsg] = React.useState<string | null>(null);

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    const data = readPersisted();
    if (data && data.remember) {
      setRemember(data.remember);
      setPhone(data.phone ?? '');
      setAddress(data.address ?? {});
      setHomeSize(data.homeSize ?? {});
      
      // Set prefill message if we have any data
      if (data.phone || data.address?.line1 || data.homeSize?.bedrooms) {
        setPrefillMsg('We prefilled your saved details.');
        
        // Clear the message after 5 seconds
        setTimeout(() => setPrefillMsg(null), 5000);
      }
    }
    setLoaded(true);
  }, []);

  // Create debounced save function
  // Note: Dependencies on remember are intentional - recreate when remember changes
  const saveDebounced = React.useMemo(
    () =>
      debounce((next: Partial<PersistedBooking>) => {
        if (!remember) return; // Don't save if remember is off
        writePersisted((prev) => ({ ...prev, remember, ...next } as PersistedBooking));
      }, 400),
    [remember]
  );

  // Update functions that trigger debounced saves
  function updatePhone(raw: string): void {
    setPhone(raw);
    const normalized = normalizePhone(raw);
    saveDebounced({ phone: normalized });
  }

  function updateAddress(next: typeof address): void {
    setAddress(next);
    saveDebounced({ address: next });
  }

  function updateHomeSize(next: typeof homeSize): void {
    setHomeSize(next);
    saveDebounced({ homeSize: next });
  }

  function toggleRemember(v: boolean): void {
    setRemember(v);
    if (v) {
      // If turning on, save current state
      writePersisted((prev) => ({
        ...prev,
        remember: v,
        phone: normalizePhone(phone),
        address,
        homeSize,
      }));
    } else {
      // If turning off, clear storage
      clearPersisted();
    }
  }

  function clearAll(): void {
    clearPersisted();
    setPhone('');
    setAddress({});
    setHomeSize({});
    setPrefillMsg(null);
  }

  return {
    loaded,
    remember,
    toggleRemember,
    phone,
    updatePhone,
    address,
    updateAddress,
    homeSize,
    updateHomeSize,
    prefillMsg,
    clearAll,
  };
}
