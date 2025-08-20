import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PreviewInsight {
  star_rating: number;
  emotional_hook: string;
  conversion_tease: string;
  category: string;
}

export interface AnalysisResult {
  temp_analysis_id: string;
  perceived_age: number;
  preview_insights: PreviewInsight[];
  expires_at: string;
  full_analysis_data: any;
  image_data: string;
}

export interface FullReport {
  analysis_id: string;
  image_url: string;
  analysis_data: any;
  created_at: string;
  expires_at: string;
}

export interface DetailedAnalysis {
  perceived_age: number;
  confidence: number;
  visual_age_analysis: string;
  deficiencies: {
    skin_tone: string;
    eyes: string;
    jawline: string;
    lips: string;
    cheeks: string;
    nutrient_flags: string[];
  };
  food_intolerances: {
    signs_present: boolean;
    potential_triggers: string[];
    recommendations: string;
  };
  womens_health: {
    hormonal_indicators: string;
    recommendations: string;
  };
  psycho_emotional_states: {
    observed_states: string[];
    stress_indicators: string;
    energy_levels: string;
  };
  internal_conflicts: {
    personality_traits: string[];
    potential_conflicts: string[];
    behavioral_patterns: string;
  };
  recommendations: {
    diet: {
      eliminate: string[];
      add: string[];
      supplements: string[];
    };
    lifestyle: {
      daily_habits: string[];
      exercise: string;
      stress_management: string[];
    };
    rest: {
      sleep_hygiene: string[];
      recovery: string[];
    };
    mindset: {
      mental_practices: string[];
      emotional_work: string[];
      thinking_patterns: string[];
    };
  };
}

const TEMP_ANALYSIS_KEY = 'glowguide_temp_analysis';
const REAL_ANALYSIS_ID_KEY = 'glowguide_real_analysis_id';

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePhoto = async (imageData: string): Promise<AnalysisResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze photo');
      }

      const result = await response.json();
      
      // Store the complete analysis data in sessionStorage
      sessionStorage.setItem(TEMP_ANALYSIS_KEY, JSON.stringify(result));
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze photo';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTempAnalysis = (): AnalysisResult | null => {
    try {
      const stored = sessionStorage.getItem(TEMP_ANALYSIS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const saveAnalysisToDatabase = async (): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Get temp analysis data from sessionStorage
      const tempAnalysis = getTempAnalysis();
      if (!tempAnalysis) {
        throw new Error('No temporary analysis data found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-analysis-post-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempAnalysisId: tempAnalysis.temp_analysis_id,
          analysisData: tempAnalysis.full_analysis_data,
          imageData: tempAnalysis.image_data,
          expiresAt: tempAnalysis.expires_at
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save analysis');
      }

      const result = await response.json();
      
      // Store the real analysis ID
      sessionStorage.setItem(REAL_ANALYSIS_ID_KEY, result.analysis_id);
      
      return result.analysis_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save analysis';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getFullReport = async (analysisId?: string): Promise<FullReport | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Use provided analysisId or get from sessionStorage
      const targetAnalysisId = analysisId || sessionStorage.getItem(REAL_ANALYSIS_ID_KEY);
      
      if (!targetAnalysisId) {
        throw new Error('No analysis ID found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-full-report/${targetAnalysisId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get full report');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get full report';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearTempData = () => {
    sessionStorage.removeItem(TEMP_ANALYSIS_KEY);
    sessionStorage.removeItem(REAL_ANALYSIS_ID_KEY);
  };

  return {
    analyzePhoto,
    getTempAnalysis,
    saveAnalysisToDatabase,
    getFullReport,
    clearTempData,
    loading,
    error
  };
}