'use client';

import { useState } from 'react';
import type { CleaningOrder } from '@/types/cleaningOrders';

interface DisputeModalProps {
  order: CleaningOrder;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, proofFiles: File[]) => Promise<void>;
}

/**
 * DisputeModal - Customer dispute submission form
 * 
 * Allows customers to:
 * - Describe the issue in detail
 * - Upload supporting photos/evidence
 * - Submit dispute within 7 days of completion
 * 
 * Shows estimated resolution time (24 hours)
 */
export function DisputeModal({
  order,
  isOpen,
  onClose,
  onSubmit,
}: DisputeModalProps) {
  const [reason, setReason] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  if (!isOpen) return null;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Limit to 5 files, max 5MB each
      const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024).slice(0, 5);
      setProofFiles(prev => [...prev, ...validFiles].slice(0, 5));
    }
  };
  
  const removeFile = (index: number) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (reason.trim().length < 20) {
      setError('Please provide more details (at least 20 characters)');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit(reason, proofFiles);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit dispute');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="dispute-modal" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Report an Issue
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Order #{order.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {/* SLA Notice */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-1">
                    Quick Resolution
                  </h3>
                  <p className="text-sm text-blue-700">
                    Our team reviews all disputes within <strong>24 hours</strong>. 
                    You'll receive an email update as soon as we've reviewed your case.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Dispute Reason */}
            <div>
              <label htmlFor="dispute-reason" className="block text-sm font-medium text-gray-700 mb-2">
                What went wrong? <span className="text-red-500">*</span>
              </label>
              <textarea
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Please describe the issue in detail. Include what areas were not cleaned properly, any damage, or other concerns..."
                maxLength={1000}
              />
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>Minimum 20 characters</span>
                <span>{reason.length}/1000</span>
              </div>
            </div>
            
            {/* Photo Evidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Photos (Optional)
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Photos help us resolve your case faster. Up to 5 photos, max 5MB each.
              </p>
              
              {/* File Upload */}
              {proofFiles.length < 5 && (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">Click to upload photos</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
              
              {/* File List */}
              {proofFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {proofFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0 text-red-600 hover:text-red-800"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* What Happens Next */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">1.</span>
                  <span>We'll review your case within 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">2.</span>
                  <span>We may contact you for additional details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">3.</span>
                  <span>You'll receive a resolution via email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">4.</span>
                  <span>If approved, refunds are processed within 48 hours</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || reason.trim().length < 20}
              className="flex-1 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Dispute'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
