'use client';

interface ScheduleCardProps {
  pickupDate: string;
  pickupWindow: string;
  deliveryDate?: string;
  deliveryWindow?: string;
  serviceType: 'LAUNDRY' | 'CLEANING';
}

export default function ScheduleCard({
  pickupDate,
  pickupWindow,
  deliveryDate,
  deliveryWindow,
  serviceType
}: ScheduleCardProps) {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeWindow: string) => {
    return timeWindow;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        📅 Service Schedule
      </h3>
      
      <div className="space-y-4">
        {/* Pickup Information */}
        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">📦</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-blue-900 mb-1">
              {serviceType === 'LAUNDRY' ? 'Laundry Pickup' : 'Cleaning Service'}
            </h4>
            <p className="text-blue-800 font-medium mb-1">
              {formatDate(pickupDate)}
            </p>
            <p className="text-blue-700 text-sm">
              Time window: {formatTime(pickupWindow)}
            </p>
            <p className="text-blue-600 text-xs mt-2">
              📱 We'll text you 15 minutes before arrival
            </p>
          </div>
        </div>

        {/* Delivery Information (for laundry) */}
        {serviceType === 'LAUNDRY' && deliveryDate && deliveryWindow && (
          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚚</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-green-900 mb-1">Laundry Delivery</h4>
              <p className="text-green-800 font-medium mb-1">
                {formatDate(deliveryDate)}
              </p>
              <p className="text-green-700 text-sm">
                Time window: {formatTime(deliveryWindow)}
              </p>
              <p className="text-green-600 text-xs mt-2">
                📱 We'll text you 15 minutes before delivery
              </p>
            </div>
          </div>
        )}

        {/* Estimated delivery for cleaning */}
        {serviceType === 'CLEANING' && (
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">✨</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 mb-1">Service Completion</h4>
              <p className="text-gray-700 text-sm">
                Your cleaning will be completed during the scheduled time window
              </p>
              <p className="text-gray-600 text-xs mt-2">
                🏠 You'll receive photos and confirmation when we're done
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
            📅 Add to Calendar
          </button>
          {serviceType === 'LAUNDRY' && (
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
              🔔 Set Reminders
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
