import React, { useEffect } from 'react';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

interface SuccessPageProps {
  onContinue: () => void;
}

export function SuccessPage({ onContinue }: SuccessPageProps) {
  useEffect(() => {
    // Add confetti effect or celebration animation here if desired
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md mx-auto text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-r from-teal-400 to-pink-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Welcome to Your Wellness Journey!
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Your subscription is now active. Get ready to discover personalized insights and transform your wellness routine.
          </p>
        </div>

        {/* Features Preview */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-500" />
            What's Next
          </h3>
          <div className="space-y-3 text-left">
            {[
              'Upload your first photo for instant wellness insights',
              'Receive your personalized 30-day transformation plan',
              'Track your progress with monthly check-ins',
              'Access exclusive wellness tips and product recommendations'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
        >
          Start Your First Analysis
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-sm text-gray-500 mt-4">
          You can manage your subscription anytime in your account settings
        </p>
      </div>
    </div>
  );
}