import React from 'react';
import { Crown, Calendar, CreditCard } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

export function SubscriptionStatus() {
  const { subscription, loading, isActive, productName } = useSubscription();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription || !isActive) {
    return null;
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="bg-gradient-to-r from-teal-50 to-pink-50 rounded-2xl p-4 border border-teal-100">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-pink-300 rounded-full flex items-center justify-center">
          <Crown className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">
            {productName || 'Active Subscription'}
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Renews {formatDate(subscription.current_period_end)}</span>
            </div>
            {subscription.payment_method_brand && subscription.payment_method_last4 && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>{subscription.payment_method_brand} •••• {subscription.payment_method_last4}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs font-medium text-teal-600 bg-teal-100 px-2 py-1 rounded-full">
          {subscription.subscription_status}
        </div>
      </div>
    </div>
  );
}