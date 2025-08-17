import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StripeProduct } from '../stripe-config';

interface CheckoutButtonProps {
  product: StripeProduct;
  className?: string;
  children?: React.ReactNode;
}

export function CheckoutButton({ product, className = '', children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setMessage({ type: 'error', text: 'Please sign in to continue' });
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: product.priceId,
          mode: product.mode,
          success_url: `${window.location.origin}?payment_success=true`,
          cancel_url: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to start checkout' 
      });
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        ) : (
          children || (
            <div className="flex items-center gap-2">
              Subscribe Now
              <ArrowRight className="w-4 h-4" />
            </div>
          )
        )}
      </button>
      
      {message && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${
          message.type === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-700' 
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}