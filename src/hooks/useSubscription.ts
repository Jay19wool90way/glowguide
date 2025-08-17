import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getProductByPriceId } from '../stripe-config';
import { useAuth } from './useAuth';

interface SubscriptionData {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: 'not_started' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const isActive = subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';
  
  const productName = subscription?.price_id ? getProductByPriceId(subscription.price_id)?.name : null;

  return {
    subscription,
    loading,
    isActive,
    productName
  };
}