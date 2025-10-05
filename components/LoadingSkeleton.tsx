'use client'

interface LoadingSkeletonProps {
  variant?: 'card' | 'slot' | 'text' | 'circle'
  className?: string
  count?: number
}

export function LoadingSkeleton({ 
  variant = 'card', 
  className = '',
  count = 1 
}: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  const getSkeletonClasses = () => {
    const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]'
    
    switch (variant) {
      case 'card':
        return `${baseClasses} rounded-card h-64 w-full`
      case 'slot':
        return `${baseClasses} rounded-input h-16 w-full`
      case 'text':
        return `${baseClasses} rounded h-4 w-full`
      case 'circle':
        return `${baseClasses} rounded-full w-12 h-12`
      default:
        return baseClasses
    }
  }

  return (
    <>
      {skeletons.map((i) => (
        <div 
          key={i} 
          className={`${getSkeletonClasses()} ${className}`}
          role="status"
          aria-label="Loading..."
        >
          <span className="sr-only">Loading...</span>
        </div>
      ))}
    </>
  )
}

// Slot Card Skeleton
export function SlotCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border-2 border-border rounded-input">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <LoadingSkeleton variant="circle" className="w-4 h-4" />
              <LoadingSkeleton variant="text" className="h-5 w-32" />
            </div>
            <LoadingSkeleton variant="text" className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Service Card Skeleton
export function ServiceCardSkeleton() {
  return (
    <div className="card h-full">
      <div className="space-y-4">
        {/* Icon */}
        <div className="flex justify-center">
          <LoadingSkeleton variant="circle" className="w-16 h-16" />
        </div>
        
        {/* Title */}
        <LoadingSkeleton variant="text" className="h-8 w-3/4 mx-auto" />
        
        {/* Description */}
        <div className="space-y-2">
          <LoadingSkeleton variant="text" className="h-4" />
          <LoadingSkeleton variant="text" className="h-4 w-5/6" />
        </div>
        
        {/* Price */}
        <div className="bg-gray-50 rounded-lg p-4">
          <LoadingSkeleton variant="text" className="h-8 w-32 mx-auto" />
        </div>
        
        {/* Features */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <LoadingSkeleton variant="circle" className="w-4 h-4 mt-0.5" />
              <LoadingSkeleton variant="text" className="h-4 flex-1" />
            </div>
          ))}
        </div>
        
        {/* Button */}
        <LoadingSkeleton variant="text" className="h-12 rounded-lg" />
      </div>
    </div>
  )
}
