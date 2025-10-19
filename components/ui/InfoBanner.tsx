'use client'

import React from 'react';
import { useCancellationPolicy } from '@/lib/useCancellationPolicy';

export type BannerType = 'info' | 'success' | 'warning' | 'error';

interface InfoBannerProps {
  type?: BannerType;
  title: string;
  message: string;
  icon?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * InfoBanner component for consistent alert/notification displays
 * 
 * Replaces the 20+ inline banner implementations found across the app
 * 
 * Usage:
 * <InfoBanner type="info" title="Policy Update" message="Free cancellation with 24+ hours notice" />
 * <InfoBanner type="success" title="Order Complete" message="Your cleaning has been finished!" icon="✅" />
 */
export function InfoBanner({ 
  type = 'info', 
  title, 
  message, 
  icon, 
  className = '',
  children 
}: InfoBannerProps) {
  // Default icons for each type
  const defaultIcons = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  const displayIcon = icon || defaultIcons[type];

  const bannerClasses = {
    info: 'banner-info',
    success: 'banner-success', 
    warning: 'banner-warning',
    error: 'banner-error'
  };

  const titleClasses = {
    info: 'banner-title-info',
    success: 'banner-title-success',
    warning: 'banner-title-warning', 
    error: 'banner-title-error'
  };

  const descriptionClasses = {
    info: 'banner-description-info',
    success: 'banner-description-success',
    warning: 'banner-description-warning',
    error: 'banner-description-error'
  };

  return (
    <div className={`${bannerClasses[type]} ${className}`}>
      <div className="banner-content">
        <span className="banner-icon">{displayIcon}</span>
        <div className="flex-1">
          <h3 className={`banner-title ${titleClasses[type]}`}>
            {title}
          </h3>
          <p className={`banner-description ${descriptionClasses[type]}`}>
            {message}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Specific banner variants for common use cases
 */

interface PolicyBannerProps {
  serviceType: 'LAUNDRY' | 'CLEANING';
  title?: string;
  className?: string;
}

export function PolicyBanner({ 
  serviceType,
  title = "Flexible Cancellation Policy",
  className 
}: PolicyBannerProps) {
  const { policy, loading, error } = useCancellationPolicy(serviceType);

  // Show loading state
  if (loading) {
    return (
      <InfoBanner
        type="info"
        title={title}
        message="Loading policy information..."
        className={className}
      />
    );
  }

  // Show error state
  if (error || !policy) {
    return (
      <InfoBanner
        type="info"
        title={title}
        message="Free rescheduling with 24+ hours notice. Cancellations incur a 15% fee if within 24 hours."
        className={className}
      />
    );
  }

  // Format the dynamic message based on the policy
  const feePercent = Math.round(policy.cancellation_fee_percent * 100);
  const noticeHours = policy.notice_hours;
  
  let message = '';
  
  if (policy.allow_rescheduling) {
    message = `Free rescheduling with ${noticeHours}+ hours notice. `;
  }
  
  if (policy.allow_cancellation) {
    message += `Cancellations incur a ${feePercent}% fee if within ${noticeHours} hours.`;
  } else {
    message += `Cancellations not permitted within ${noticeHours} hours.`;
  }

  return (
    <InfoBanner
      type="info"
      title={title}
      message={message.trim()}
      className={className}
    />
  );
}

interface ServiceInfoBannerProps {
  service: 'laundry' | 'cleaning';
  className?: string;
}

export function ServiceInfoBanner({ service, className }: ServiceInfoBannerProps) {
  const content = {
    laundry: {
      title: "Free Pickup & Delivery Included",
      message: "We pick up your laundry and deliver it back to you at no extra charge. Standard turnaround: 2-3 business days."
    },
    cleaning: {
      title: "Professional Cleaning Service", 
      message: "Our experienced cleaners bring all supplies and equipment. We're fully insured and background-checked."
    }
  };

  return (
    <InfoBanner
      type="success"
      title={content[service].title}
      message={content[service].message}
      className={className}
    />
  );
}

interface PaymentBannerProps {
  isSetupIntent?: boolean;
  className?: string;
}

export function PaymentBanner({ isSetupIntent = false, className }: PaymentBannerProps) {
  const title = isSetupIntent ? "💳 Secure Booking" : "💰 Pay After Service";
  const message = isSetupIntent 
    ? "Your card is securely saved. You'll be charged $0.00 now and the exact amount after we complete your service."
    : "No payment required now. We'll send you the final invoice after completing your service.";

  return (
    <InfoBanner
      type="info"
      title={title}
      message={message}
      className={className}
    />
  );
}

/**
 * DryCleanBanner - For dry cleaning pricing notice
 */
export function DryCleanBanner({ className }: { className?: string }) {
  return (
    <InfoBanner
      type="warning"
      title="Dry Clean Pricing"
      message="Final price will be quoted after inspecting your items. You'll receive the exact quote before we proceed."
      icon="ℹ️"
      className={className}
    />
  );
}

/**
 * RushServiceBanner - For rush service availability
 */
export function RushServiceBanner({ className }: { className?: string }) {
  return (
    <InfoBanner
      type="info" 
      title="⚡ Rush Service Available"
      message="Same-day return if picked up before 11 AM, otherwise next-day delivery (+25% fee)"
      className={className}
    />
  );
}
