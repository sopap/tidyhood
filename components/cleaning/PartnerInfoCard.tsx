'use client';

import { useState, useEffect } from 'react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

interface Partner {
  id: string;
  name: string;
  photo_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  phone?: string | null;
}

interface PartnerInfoCardProps {
  partnerId: string;
  className?: string;
}

/**
 * PartnerInfoCard - Displays assigned partner information
 * 
 * Shows:
 * - Partner name
 * - Profile photo (or placeholder)
 * - Rating & review count
 * - Contact button
 * 
 * Builds trust and transparency for customers
 */
export function PartnerInfoCard({ partnerId, className = '' }: PartnerInfoCardProps) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchPartner() {
      try {
        const res = await fetch(`/api/partners/${partnerId}`);
        
        if (!res.ok) {
          throw new Error('Failed to load partner information');
        }
        
        const data = await res.json();
        setPartner(data);
      } catch (err) {
        console.error('Partner fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPartner();
  }, [partnerId]);
  
  if (loading) {
    return (
      <div className={`partner-info-card bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-4">
          <LoadingSkeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1">
            <LoadingSkeleton className="h-5 w-32 mb-2" />
            <LoadingSkeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !partner) {
    return null; // Silently fail - partner info is nice-to-have
  }
  
  return (
    <div className={`partner-info-card bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Your Cleaner
      </h2>
      
      <div className="flex items-center gap-4">
        {/* Partner Photo */}
        <div className="flex-shrink-0">
          {partner.photo_url ? (
            <img
              src={partner.photo_url}
              alt={partner.name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-md"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-white shadow-md">
              <span className="text-2xl font-bold text-white">
                {partner.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Partner Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {partner.name}
          </h3>
          
          {/* Rating */}
          {partner.rating !== null && partner.rating !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                <span className="text-yellow-400 text-lg">★</span>
                <span className="text-sm font-semibold text-gray-700 ml-1">
                  {partner.rating.toFixed(1)}
                </span>
              </div>
              {partner.review_count && partner.review_count > 0 && (
                <span className="text-sm text-gray-500">
                  ({partner.review_count} {partner.review_count === 1 ? 'review' : 'reviews'})
                </span>
              )}
            </div>
          )}
          
          {/* Verified Badge */}
          <div className="flex items-center gap-1 mt-2">
            <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-green-700 font-medium">
              Verified Professional
            </span>
          </div>
        </div>
        
        {/* Contact Button - Desktop */}
        <div className="hidden md:block">
          <button
            onClick={() => handleContact(partner)}
            className="px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 active:scale-95 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Contact
          </button>
        </div>
      </div>
      
      {/* Contact Button - Mobile (Full Width) */}
      <button
        onClick={() => handleContact(partner)}
        className="md:hidden mt-4 w-full px-4 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        Contact {partner.name}
      </button>
    </div>
  );
}

/**
 * Handle contact button click
 */
function handleContact(partner: Partner) {
  if (partner.phone) {
    // On mobile, this will trigger the phone dialer
    window.location.href = `tel:${partner.phone}`;
  } else {
    // Fallback: Open support
    window.location.href = '/contact';
  }
}
