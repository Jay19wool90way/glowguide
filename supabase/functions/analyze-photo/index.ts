import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://glowguide-personal-b-ump1.bolt.host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a temporary UUID for client-side tracking
function generateTempId(): string {
  return 'temp_' + crypto.randomUUID();
}

// Generate wellness insights using GPT based on Google Vision API results
async function generateWellnessInsights(faceAnnotations: any[], imageBase64: string): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Prepare face detection data for the prompt
  let faceData = "No face detected in the image.";
  
  if (faceAnnotations && faceAnnotations.length > 0) {
    const face = faceAnnotations[0];
    faceData = `Face detected with the following characteristics:
- Detection confidence: ${(face.detectionConfidence * 100).toFixed(1)}%
- Joy likelihood: ${face.joyLikelihood || 'UNKNOWN'}
- Sorrow likelihood: ${face.sorrowLikelihood || 'UNKNOWN'}
- Anger likelihood: ${face.angerLikelihood || 'UNKNOWN'}
- Surprise likelihood: ${face.surpriseLikelihood || 'UNKNOWN'}
- Under-exposed likelihood: ${face.underExposedLikelihood || 'UNKNOWN'}
- Blurred likelihood: ${face.blurredLikelihood || 'UNKNOWN'}
- Headwear likelihood: ${face.headwearLikelihood || 'UNKNOWN'}`;
  }

  const prompt = `Analyze this face like a pro: As a physiognomist, nutritionist, psychosomatic expert, and women's health specialist. 

Face detection data: ${faceData}

Answer the following questions:
1. How old do I look visually?
2. What deficiencies can be detected based on facial expressions, skin tone, eyes, jawline, lips, and cheeks?
3. Are there visible signs of possible food intolerances or reactions?
4. What should I pay attention to in terms of women's health?
5. What psycho-emotional states might have affected my current appearance?
6. What internal conflicts and personality traits are reflected in my face?
7. What would you recommend I change in my diet, lifestyle, rest habits, mindset, and thinking patterns?

Please provide a comprehensive analysis in the following JSON format:
{
  "perceived_age": number,
  "confidence": number (0-1),
  "visual_age_analysis": "detailed explanation of perceived age",
  "deficiencies": {
    "skin_tone": "observations about skin tone and potential deficiencies",
    "eyes": "observations about eyes and what they reveal",
    "jawline": "observations about jawline and tension",
    "lips": "observations about lips and hydration/nutrition",
    "cheeks": "observations about cheeks and overall health",
    "nutrient_flags": ["list of potential nutrient deficiencies"]
  },
  "food_intolerances": {
    "signs_present": boolean,
    "potential_triggers": ["list of potential food triggers"],
    "recommendations": "testing and elimination recommendations"
  },
  "womens_health": {
    "hormonal_indicators": "observations about potential hormonal patterns",
    "recommendations": "specific women's health recommendations"
  },
  "psycho_emotional_states": {
    "observed_states": ["list of observed emotional/psychological states"],
    "stress_indicators": "signs of stress or emotional patterns",
    "energy_levels": "assessment of energy and vitality"
  },
  "internal_conflicts": {
    "personality_traits": ["observed personality traits"],
    "potential_conflicts": ["internal conflicts or tensions"],
    "behavioral_patterns": "patterns reflected in facial expression"
  },
  "recommendations": {
    "diet": {
      "eliminate": ["foods to eliminate or test"],
      "add": ["foods to add"],
      "supplements": ["recommended supplements with dosages"]
    },
    "lifestyle": {
      "daily_habits": ["specific daily habit recommendations"],
      "exercise": "exercise recommendations",
      "stress_management": ["stress management techniques"]
    },
    "rest": {
      "sleep_hygiene": ["sleep improvement recommendations"],
      "recovery": ["recovery and restoration practices"]
    },
    "mindset": {
      "mental_practices": ["mindset and mental health practices"],
      "emotional_work": ["emotional processing recommendations"],
      "thinking_patterns": ["cognitive pattern adjustments"]
    }
  },
  "preview_insights": [
    {
      "star_rating": number (1-5),
      "emotional_hook": "compelling insight about their wellness",
      "conversion_tease": "what they'll discover in the full plan",
      "category": "category name"
    }
  ],
  "daily_rituals": [
    {
      "category": "category name",
      "rituals": [
        {
          "title": "ritual name",
          "description": "detailed description"
        }
      ]
    }
  ],
  "product_recommendations": [
    {
      "name": "product name",
      "dosage": "how to use",
      "reason": "why recommended for this person",
      "expected_result": "what to expect",
      "price_band": "price range",
      "timeline": "when to expect results"
    }
  ]
}

Be specific, detailed, and personalized in your analysis. Draw from the facial detection data and provide actionable insights.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis content received from OpenAI');
    }

    // Parse the JSON response from GPT
    let analysisData;
    try {
      // Extract JSON from the response (in case GPT adds extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in GPT response');
      }
    } catch (parseError) {
      console.error('Failed to parse GPT response as JSON:', parseError);
      console.error('Raw GPT response:', analysisText);
      throw new Error('Failed to parse analysis results');
    }

    return analysisData;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    console.log('=== ANALYZE PHOTO FUNCTION START ===');
    console.log('Request method:', req.method);

    // Check for Google Vision API key
    const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!googleApiKey) {
      console.error('GOOGLE_VISION_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'Google Vision API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Both API keys found');

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('Handling CORS preflight request');
      console.log('CORS preflight request received');
      console.log('Request headers:', Object.fromEntries(req.headers.entries()));
      console.log('Response headers being sent:', corsHeaders);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      console.log('Invalid method received:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    console.log('Parsing request body...');
    const { imageData } = await req.json();
    console.log('Image data received:', !!imageData);
    
    if (!imageData) {
      console.error('No image data provided in request');
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary analysis ID
    const tempAnalysisId = generateTempId();
    console.log('Generated temp analysis ID:', tempAnalysisId);

    // Extract base64 image data (remove data:image/jpeg;base64, prefix)
    const base64Image = imageData.split(',')[1];
    
    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: 'Invalid image data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Google Vision API for face detection
    console.log('Making request to Google Vision API...');
    
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'FACE_DETECTION',
                maxResults: 1
              },
              {
                type: 'SAFE_SEARCH_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      })
    });

    console.log('Google Vision API response status:', visionResponse.status);

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Google Vision API error:', errorText);
      
      if (visionResponse.status === 401 || visionResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Google Vision API authentication failed',
            details: 'Please check the Google Vision API key configuration'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze image with Google Vision API', 
          details: `Google Vision API returned ${visionResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionData = await visionResponse.json();
    const faceAnnotations = visionData.responses?.[0]?.faceAnnotations;
    console.log('Face annotations found:', !!faceAnnotations);

    // Generate wellness insights using GPT
    console.log('Generating wellness insights with GPT...');
    const analysisData = await generateWellnessInsights(faceAnnotations, base64Image);
    console.log('GPT analysis completed');

    // Calculate expiration time (60 minutes from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    console.log('Analysis expires at:', expiresAt.toISOString());

    // Return the analysis data with temporary ID for client-side storage
    console.log('Returning successful analysis response');
    return new Response(
      JSON.stringify({
        temp_analysis_id: tempAnalysisId,
        perceived_age: analysisData.perceived_age,
        preview_insights: analysisData.preview_insights,
        expires_at: expiresAt.toISOString(),
        full_analysis_data: analysisData, // Include full data for client storage
        image_data: imageData // Include image data for later database save
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== ANALYZE PHOTO FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END ERROR ===');
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});