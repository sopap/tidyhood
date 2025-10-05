export default function OrderDetailsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
      {/* Summary skeleton */}
      <div className="h-24 bg-gray-200 rounded-xl" />
      {/* Progress skeleton */}
      <div className="h-32 bg-gray-200 rounded-xl" />
      {/* Service + Address card */}
      <div className="h-40 bg-gray-200 rounded-xl" />
      {/* Pricing card */}
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  );
}
