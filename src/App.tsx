import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Star, Heart, Zap, CheckCircle, ArrowRight, Sparkles, Moon, Sun, Droplets, Leaf, Timer, Clock, Users, ChevronDown, ChevronUp, Eye, Smile, Activity, LogOut, User } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import { useAnalysis } from './hooks/useAnalysis';
import { AuthForm } from './components/AuthForm';
import { SubscriptionStatus } from './components/SubscriptionStatus';
import { CheckoutButton } from './components/CheckoutButton';
import { SuccessPage } from './components/SuccessPage';
import { PhotoUpload } from './components/PhotoUpload';
import { DetailedAnalysis } from './hooks/useAnalysis';
import { STRIPE_PRODUCTS } from './stripe-config';

type AppState = 'landing' | 'upload' | 'preview' | 'payment' | 'post-payment-auth' | 'plan' | 'progress';
type AuthMode = 'login' | 'signup';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isActive: hasActiveSubscription, loading: subscriptionLoading } = useSubscription();
  const { analyzePhoto, getTempAnalysis, saveAnalysisToDatabase, getFullReport, clearTempData, loading: analysisLoading, error: analysisError } = useAnalysis();
  const [appState, setAppState] = useState<AppState>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [fullReportData, setFullReportData] = useState<any>(null);
  const [countdownTime, setCountdownTime] = useState<number>(3600); // 60 minutes in seconds
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Handle URL-based navigation for post-payment flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
      setAppState('post-payment-auth');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load temp analysis on app start if it exists
  useEffect(() => {
    const tempAnalysis = getTempAnalysis();
    if (tempAnalysis && !currentAnalysis) {
      setCurrentAnalysis(tempAnalysis);
      // Calculate remaining time
      const expiresAt = new Date(tempAnalysis.expires_at);
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setCountdownTime(timeLeft);
      
      if (timeLeft > 0) {
        setAppState('preview');
      }
    }
  }, []);

  // Real-time countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (appState === 'preview' && countdownTime > 0) {
      interval = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 1) {
            // Timer expired - reset to upload state
            clearTempData();
            setCurrentAnalysis(null);
            setAppState('upload');
            setUploadedImage(null);
            return 3600; // Reset to 60 minutes
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [appState, countdownTime]);

  // Format countdown time as MM:SS
  const formatCountdownTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleImageSelect = async (imageData: string) => {
    if (!imageData) {
      setUploadedImage(null);
      setCurrentAnalysis(null);
      clearTempData();
      return;
    }

    setUploadedImage(imageData);
    
    // Call the analyze-photo API (no auth required)
    const result = await analyzePhoto(imageData);
    
    if (result) {
      setCurrentAnalysis(result);
      
      // Calculate countdown time based on expires_at
      const expiresAt = new Date(result.expires_at);
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setCountdownTime(timeLeft);
      
      setAppState('preview');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clearTempData();
    setCurrentAnalysis(null);
    setFullReportData(null);
    setAppState('landing');
  };

  const handleAuthSuccess = async () => {
    // This is called after post-payment authentication
    if (appState === 'post-payment-auth') {
      // Save the temporary analysis to database
      const realAnalysisId = await saveAnalysisToDatabase();
      
      if (realAnalysisId) {
        // Fetch the full report
        const reportData = await getFullReport(realAnalysisId);
        if (reportData) {
          setFullReportData(reportData);
          setAppState('plan');
        }
      }
    } else {
      setAppState('landing');
    }
  };

  const handleStartAnalysis = () => {
    // No authentication required for initial analysis
    setAppState('upload');
  };

  const handleGetPlan = async () => {
    // Always go to payment page (no auth check here)
    setAppState('payment');
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Enhanced preview insights with emotional hooks and conversion teases
  const getIconForCategory = (category: string) => {
    switch (category.toLowerCase()) {
      case 'age': return <Sparkles className="w-5 h-5" />;
      case 'skin': return <Droplets className="w-5 h-5" />;
      case 'stress': return <Heart className="w-5 h-5" />;
      case 'energy': return <Zap className="w-5 h-5" />;
      case 'sleep': return <Moon className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  // Show loading screen while checking auth
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form
  if (appState === 'post-payment-auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-pink-300 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">GlowGuide</h1>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Almost There!
            </h2>
            <p className="text-gray-600">
              Create your account to access your personalized wellness plan
            </p>
          </div>
          
          <AuthForm 
            mode="signup"
            onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            onSuccess={handleAuthSuccess}
          />
        </div>
      </div>
    );
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
        ))}
      </div>
    );
  };

  const renderLanding = () => (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-pink-300 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">GlowGuide</h1>
        </div>
        
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 p-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No account needed to start
          </div>
        )}
      </header>

      {/* Subscription Status */}
      {user && (
        <div className="px-6 mb-4">
          <SubscriptionStatus />
        </div>
      )}

      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-12 text-center">
        <p className="text-sm text-gray-600 mb-8">Your personal beauty & wellness companion</p>
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
            Your face reflects your 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-pink-400"> inner wellness</span> story
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
            Upload a photo → discover your wellness insights → follow your personalized glow plan
          </p>
          
          <button 
            onClick={handleStartAnalysis}
            className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 mx-auto"
          >
            <Camera className="w-6 h-6" />
            Discover My Wellness Insights
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            No signup required • Start your analysis now
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: <Zap className="w-8 h-8 text-teal-500" />, title: "Instant Insights", desc: "Personalized wellness analysis in seconds" },
            { icon: <Heart className="w-8 h-8 text-pink-400" />, title: "30-Day Plan", desc: "Custom wellness journey tailored for you" },
            { icon: <Star className="w-8 h-8 text-yellow-500" />, title: "Track Progress", desc: "Celebrate your transformation monthly" }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="flex justify-center mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => setAppState('landing')}
            className="text-gray-500 hover:text-gray-700 mb-6"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Share Your Photo</h2>
          <p className="text-gray-600">Take or upload a clear photo of your face in good lighting</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 mb-6">
          <PhotoUpload 
            onImageSelect={handleImageSelect}
            loading={analysisLoading}
            uploadedImage={uploadedImage}
          />
        </div>

        {/* Analysis Error */}
        {analysisError && (
          <div className="bg-red-50 rounded-2xl p-4 border border-red-200 mb-6">
            <p className="text-red-700 text-sm">
              <strong>Analysis Error:</strong> {analysisError}
            </p>
          </div>
        )}

        {/* Consent */}
        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
          <p className="text-sm text-gray-700">
            <strong>Wellness Guidance Only:</strong> This provides general wellness insights, not medical advice. 
            Your photo is processed securely and deleted after analysis.
          </p>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => setAppState('upload')}
            className="text-gray-500 hover:text-gray-700 mb-6"
          >
            ← Back
          </button>
          <div className="flex items-center justify-center gap-2 text-teal-600 mb-4">
            <Sparkles className="w-6 h-6" />
            <span className="font-medium">Analysis Complete</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Wellness Insights Preview</h2>
          <p className="text-gray-600">Here's what your face reveals about your inner wellness potential</p>
        </div>

        {/* Enhanced Preview Insights */}
        <div className="space-y-6 mb-8">
          {currentAnalysis?.preview_insights?.map((insight: any, idx: number) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-teal-100 to-pink-100 rounded-xl flex items-center justify-center text-teal-600">
                  {getIconForCategory(insight.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {idx === 0 && currentAnalysis?.perceived_age && (
                      <div className="text-2xl font-bold text-gray-800">Age {currentAnalysis.perceived_age}</div>
                    )}
                    {renderStarRating(insight.star_rating)}
                  </div>
                  <p className="text-gray-700 mb-3 leading-relaxed">{insight.emotional_hook}</p>
                  <p className="text-teal-600 font-medium text-sm">{insight.conversion_tease}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Urgency Elements */}
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200 mb-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-yellow-700">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Analysis expires in {formatCountdownTime(countdownTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-700">
              <Users className="w-4 h-4" />
              <span>1,247 people unlocked plans this week</span>
            </div>
          </div>
        </div>

        {/* Enhanced Paywall CTA */}
        <div className="bg-gradient-to-r from-teal-500 to-pink-400 rounded-3xl p-8 text-center text-white shadow-xl">
          <h3 className="text-2xl font-bold mb-4">Your transformation blueprint is ready</h3>
          <p className="mb-6 opacity-90">
            Unlock your complete wellness insights and 30-day transformation plan
          </p>
          <CheckoutButton
            product={STRIPE_PRODUCTS[0]}
            className="bg-white text-teal-600 px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            <div className="flex items-center gap-2">
              Get My Complete Plan - {STRIPE_PRODUCTS[0].price}
              <ArrowRight className="w-5 h-5" />
            </div>
          </CheckoutButton>
        </div>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => setAppState('preview')}
            className="text-gray-500 hover:text-gray-700 mb-6"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Unlock Your Complete Plan</h2>
          <p className="text-gray-600">Get personalized insights and your 30-day transformation journey</p>
        </div>

        {/* Product Card */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-400 to-pink-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{STRIPE_PRODUCTS[0].name}</h3>
            <p className="text-gray-600 mb-4">{STRIPE_PRODUCTS[0].description}</p>
            <div className="text-3xl font-bold text-teal-600 mb-6">{STRIPE_PRODUCTS[0].price}</div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {[
              'Instant facial wellness analysis',
              'Personalized 30-day transformation plan',
              'Daily wellness rituals tailored for you',
              'Product recommendations with timelines',
              'Monthly progress tracking',
              'Exclusive wellness insights'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Checkout Button */}
          <CheckoutButton
            product={STRIPE_PRODUCTS[0]}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          />
        </div>

        {/* Trust Indicators */}
        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 text-center">
          <p className="text-sm text-gray-700">
            <strong>Secure Payment:</strong> Powered by Stripe • Account created after payment • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );

  const renderPlan = () => (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => setAppState('landing')}
            className="text-gray-500 hover:text-gray-700 mb-6"
          >
            ← Back to Home
          </button>
          <div className="flex items-center justify-center gap-2 text-teal-600 mb-4">
            <CheckCircle className="w-6 h-6" />
            <span className="font-medium">Welcome to Your Wellness Journey!</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Complete Wellness Analysis</h2>
          <p className="text-gray-600">Comprehensive insights and personalized transformation plan</p>
        </div>

        {/* Detailed Wellness Age Analysis */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-500" />
              Visual Age Analysis
            </h3>
            <button
              onClick={() => toggleSection('visual-age')}
              className="text-gray-500 hover:text-gray-700"
            >
              {expandedSections['visual-age'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
          
          {fullReportData?.analysis_data && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-bold text-teal-600">{fullReportData.analysis_data.perceived_age} years</div>
                <div className="text-sm text-gray-600">
                  Confidence: {Math.round(fullReportData.analysis_data.confidence * 100)}%
                </div>
              </div>

              {expandedSections['visual-age'] && (
                <div className="space-y-4">
                  <div className="bg-teal-50 rounded-xl p-4">
                    <h4 className="font-medium text-teal-800 mb-2">Analysis:</h4>
                    <p className="text-teal-700 text-sm">{fullReportData.analysis_data.visual_age_analysis}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Deficiencies Analysis */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5 text-pink-400" />
            Deficiencies & Facial Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fullReportData?.analysis_data?.deficiencies && Object.entries(fullReportData.analysis_data.deficiencies).filter(([key]) => key !== 'nutrient_flags').map(([key, observation]: [string, any]) => (
              <div key={key} className="border border-gray-100 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 capitalize mb-3">
                  {key.replace('_', ' ')}
                </h4>
                <p className="text-gray-600 text-sm">{observation}</p>
              </div>
            ))}
          </div>
          
          {fullReportData?.analysis_data?.deficiencies?.nutrient_flags && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-800 mb-3">Potential Nutrient Flags:</h4>
              <div className="flex flex-wrap gap-2">
                {fullReportData.analysis_data.deficiencies.nutrient_flags.map((flag: string, idx: number) => (
                  <span key={idx} className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Food Intolerances */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Food Intolerances & Reactions
          </h3>
          
          {fullReportData?.analysis_data?.food_intolerances && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${
                fullReportData.analysis_data.food_intolerances.signs_present 
                  ? 'bg-orange-50 border border-orange-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <p className={`font-medium ${
                  fullReportData.analysis_data.food_intolerances.signs_present 
                    ? 'text-orange-800' 
                    : 'text-green-800'
                }`}>
                  {fullReportData.analysis_data.food_intolerances.signs_present 
                    ? 'Potential food sensitivity signs detected' 
                    : 'No obvious food sensitivity signs detected'
                  }
                </p>
              </div>
              
              {fullReportData.analysis_data.food_intolerances.potential_triggers.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Potential Triggers to Test:</h4>
                  <div className="flex flex-wrap gap-2">
                    {fullReportData.analysis_data.food_intolerances.potential_triggers.map((trigger: string, idx: number) => (
                      <span key={idx} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">Testing Recommendations:</h4>
                <p className="text-blue-700 text-sm">{fullReportData.analysis_data.food_intolerances.recommendations}</p>
              </div>
            </div>
          )}
        </div>

        {/* Psycho-Emotional States */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-purple-500" />
            Psycho-Emotional Assessment
          </h3>
          
          {fullReportData?.analysis_data?.psycho_emotional_states && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Observed States:</h4>
                <div className="flex flex-wrap gap-2">
                  {fullReportData.analysis_data.psycho_emotional_states.observed_states.map((state: string, idx: number) => (
                    <span key={idx} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                      {state}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="font-medium text-purple-800 mb-2">Stress Indicators:</h4>
                <p className="text-purple-700 text-sm">{fullReportData.analysis_data.psycho_emotional_states.stress_indicators}</p>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-medium text-green-800 mb-2">Energy Assessment:</h4>
                <p className="text-green-700 text-sm">{fullReportData.analysis_data.psycho_emotional_states.energy_levels}</p>
              </div>
            </div>
          )}
        </div>

        {/* Internal Conflicts & Personality */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            Personality & Internal Patterns
          </h3>
          
          {fullReportData?.analysis_data?.internal_conflicts && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Personality Traits:</h4>
                <div className="flex flex-wrap gap-2">
                  {fullReportData.analysis_data.internal_conflicts.personality_traits.map((trait: string, idx: number) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
              
              {fullReportData.analysis_data.internal_conflicts.potential_conflicts.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Potential Internal Conflicts:</h4>
                  <ul className="space-y-1">
                    {fullReportData.analysis_data.internal_conflicts.potential_conflicts.map((conflict: string, idx: number) => (
                      <li key={idx} className="text-gray-600 text-sm flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        {conflict}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="bg-indigo-50 rounded-xl p-4">
                <h4 className="font-medium text-indigo-800 mb-2">Behavioral Patterns:</h4>
                <p className="text-indigo-700 text-sm">{fullReportData.analysis_data.internal_conflicts.behavioral_patterns}</p>
              </div>
            </div>
          )}
        </div>

        {/* Comprehensive Recommendations */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            Comprehensive Recommendations
          </h3>
          
          {fullReportData?.analysis_data?.recommendations && (
            <div className="space-y-6">
              {/* Diet Recommendations */}
              <div className="border-l-4 border-green-200 pl-6">
                <h4 className="font-semibold text-gray-800 mb-4">Diet & Nutrition</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h5 className="font-medium text-red-700 mb-2">Eliminate/Test:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.diet.eliminate.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-green-700 mb-2">Add:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.diet.add.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-700 mb-2">Supplements:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.diet.supplements.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Lifestyle Recommendations */}
              <div className="border-l-4 border-blue-200 pl-6">
                <h4 className="font-semibold text-gray-800 mb-4">Lifestyle Changes</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Daily Habits:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.lifestyle.daily_habits.map((habit: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          {habit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h5 className="font-medium text-blue-800 mb-1">Exercise:</h5>
                    <p className="text-blue-700 text-sm">{fullReportData.analysis_data.recommendations.lifestyle.exercise}</p>
                  </div>
                </div>
              </div>
              
              {/* Rest & Recovery */}
              <div className="border-l-4 border-purple-200 pl-6">
                <h4 className="font-semibold text-gray-800 mb-4">Rest & Recovery</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Sleep Hygiene:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.rest.sleep_hygiene.map((tip: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Recovery Practices:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.rest.recovery.map((practice: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {practice}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Mindset & Mental Health */}
              <div className="border-l-4 border-pink-200 pl-6">
                <h4 className="font-semibold text-gray-800 mb-4">Mindset & Mental Health</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Mental Practices:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.mindset.mental_practices.map((practice: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <Heart className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                          {practice}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Emotional Work:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.mindset.emotional_work.map((work: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {work}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Thinking Pattern Adjustments:</h5>
                    <ul className="space-y-1">
                      {fullReportData.analysis_data.recommendations.mindset.thinking_patterns.map((pattern: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {pattern}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Daily Rituals */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Personalized Daily Rituals
          </h3>
          
          <div className="space-y-6">
            {fullReportData?.analysis_data?.daily_rituals?.map((category: any, idx: number) => (
              <div key={idx} className="border-l-4 border-teal-200 pl-6">
                <h4 className="font-semibold text-gray-800 mb-4">{category.category}</h4>
                <div className="space-y-3">
                  {category.rituals.map((ritual: any, ritualIdx: number) => (
                    <div key={ritualIdx} className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-pink-50 rounded-xl">
                      <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg shadow-sm">
                        <Activity className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-800 mb-1">{ritual.title}</h5>
                        <p className="text-gray-600 text-sm">{ritual.description}</p>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Recommendations */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            Targeted Wellness Products
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fullReportData?.analysis_data?.product_recommendations?.map((product: any, idx: number) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">{product.name}</h4>
                  <span className="text-sm font-medium text-gray-600">{product.price_band}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Dosage:</span>
                    <span className="text-gray-600 ml-2">{product.dosage}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Why for you:</span>
                    <p className="text-gray-600 mt-1">{product.reason}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <span className="font-medium text-green-800">Expected result:</span>
                    <p className="text-green-700 mt-1">{product.expected_result}</p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-3">
                    <span className="font-medium text-blue-800">Timeline:</span>
                    <p className="text-blue-700 mt-1">{product.timeline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Encouragement */}
        <div className="bg-gradient-to-r from-teal-500 to-pink-400 rounded-3xl p-8 text-center text-white shadow-xl mb-8">
          <Heart className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <p className="text-lg leading-relaxed">
            Your personalized wellness blueprint combines targeted nutrition, stress management, and lifestyle optimization based on your unique facial analysis.
          </p>
        </div>

        {/* Monthly Check-in CTA */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Ready for Your First Check-in?</h3>
          <p className="text-gray-600 mb-6">Track your progress and celebrate your transformation in 30 days</p>
          <button 
            onClick={() => setAppState('progress')}
            className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Schedule Monthly Check-in
          </button>
        </div>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => setAppState('plan')}
            className="text-gray-500 hover:text-gray-700 mb-6"
          >
            ← Back to Plan
          </button>
          <div className="flex items-center justify-center gap-2 text-pink-500 mb-4">
            <Star className="w-6 h-6 fill-current" />
            <span className="font-medium">30-Day Progress Celebration</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Beautiful Transformation!</h2>
          <p className="text-gray-600">Your wellness journey is showing wonderful results</p>
        </div>

        {/* Progress Comparison */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Your Wellness Growth</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { category: "Wellness Age", change: "+1 year younger", color: "text-green-600" },
              { category: "Nourishment", change: "+2 points", color: "text-green-600" },
              { category: "Inner Balance", change: "+2 points", color: "text-green-600" },
              { category: "Lifestyle Harmony", change: "+1 point", color: "text-green-600" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <span className="text-gray-700 font-medium">{item.category}</span>
                <span className={`${item.color} font-semibold`}>{item.change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Beautiful Changes */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            Beautiful Changes We Notice
          </h3>
          <div className="space-y-3">
            {[
              "Brighter, more hydrated skin tone - your water intake is working!",
              "Reduced under-eye puffiness - sleep quality improvements showing",
              "More balanced facial symmetry - stress management paying off"
            ].map((change, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-pink-50 rounded-xl">
                <Smile className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Phase Adjustments */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Next 30 Days</h3>
          <div className="space-y-3">
            {[
              "Continue your caffeine boundary success - it's working beautifully!",
              "Add magnesium glycinate for deeper, more restorative sleep"
            ].map((adjustment, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-teal-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{adjustment}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Celebration */}
        <div className="bg-gradient-to-r from-pink-400 to-pink-500 rounded-3xl p-8 text-center text-white shadow-xl mb-8">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-current animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <h3 className="text-2xl font-bold mb-4">Congratulations on Your Journey!</h3>
          <p className="text-lg leading-relaxed opacity-95 mb-6">
            Beautiful progress in hydration and radiance! Your caffeine boundary is working wonderfully. 
            Let's add gentle sleep support for your next 30 days of glowing.
          </p>
          <button 
            onClick={() => setAppState('plan')}
            className="bg-white text-pink-500 px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Continue Your Wellness Journey
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="font-inter antialiased">
      {appState === 'landing' && renderLanding()}
      {appState === 'upload' && renderUpload()}
      {appState === 'preview' && renderPreview()}
      {appState === 'payment' && renderPayment()}
      {appState === 'plan' && renderPlan()}
      {appState === 'progress' && renderProgress()}
    </div>
  );
}

export default App;