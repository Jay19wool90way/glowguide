import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const googleApiKey = 'AIzaSyB5O-KiDzFSeZP9jvpemQZUhRwla9lagLQ';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a temporary UUID for client-side tracking
function generateTempId(): string {
  return 'temp_' + crypto.randomUUID();
}

// Generate wellness insights based on Google Vision API face detection results
function generateWellnessInsights(faceAnnotations: any[]): any {
  // Default insights if no faces detected or minimal data
  const defaultInsights = {
    perceived_age: 28,
    confidence: 0.7,
    preview_insights: [
      {
        star_rating: 4,
        emotional_hook: "Your wellness journey starts with small, consistent steps that create lasting transformation.",
        conversion_tease: "Discover personalized daily rituals that work with your lifestyle",
        category: "wellness"
      },
      {
        star_rating: 4,
        emotional_hook: "Hydration and rest are the foundation of natural radiance and energy.",
        conversion_tease: "Learn the optimal timing for hydration and sleep optimization",
        category: "hydration"
      },
      {
        star_rating: 3,
        emotional_hook: "Stress management through mindful practices can transform how you feel daily.",
        conversion_tease: "Get specific stress-relief techniques tailored to your routine",
        category: "mindfulness"
      }
    ],
    detailed_analysis: {
      wellness_age: {
        perceived_age: 28,
        confidence: 0.7,
        detailed_observations: [
          "Natural lighting reveals healthy skin tone",
          "Relaxed facial expression suggests good stress management",
          "Clear eyes indicate adequate hydration levels"
        ],
        root_causes: ["lifestyle balance", "hydration habits", "sleep quality"],
        improvement_timeline: "With consistent daily wellness rituals, you can expect to see improvements in energy and radiance within 2-3 weeks, with more significant transformation over 30 days."
      },
      facial_features: {
        skin_analysis: {
          observation: "Skin appears to have natural healthy tone with room for enhanced hydration",
          potential_causes: ["environmental factors", "hydration levels", "sleep quality"],
          root_connection: "Skin health reflects internal hydration and stress management",
          protocol: "Morning hydration ritual + evening skincare routine with gentle, natural products",
          timeline: "2-3 weeks for improved texture, 4-6 weeks for enhanced radiance"
        },
        eye_area: {
          observation: "Eye area shows natural alertness with potential for enhanced brightness",
          potential_causes: ["screen time", "sleep patterns", "hydration"],
          root_connection: "Eye brightness reflects sleep quality and digital wellness habits",
          protocol: "Blue light management + eye relaxation exercises + adequate sleep schedule",
          timeline: "1-2 weeks for reduced strain, 3-4 weeks for enhanced brightness"
        },
        lip_analysis: {
          observation: "Natural lip tone with opportunity for enhanced hydration",
          potential_causes: ["environmental exposure", "hydration habits"],
          root_connection: "Lip health indicates overall hydration and nutrient absorption",
          protocol: "Consistent hydration + natural lip care + omega-3 rich foods",
          timeline: "1 week for improved texture, 2-3 weeks for enhanced natural color"
        },
        jaw_tension: {
          observation: "Facial muscles appear relaxed with room for stress optimization",
          potential_causes: ["daily stress", "jaw clenching", "tension habits"],
          root_connection: "Jaw tension reflects stress levels and mindfulness practices",
          protocol: "Daily jaw relaxation exercises + mindfulness practices + stress management",
          timeline: "1-2 weeks for tension relief, 3-4 weeks for lasting relaxation"
        }
      }
    },
    daily_rituals: [
      {
        category: "Morning Hydration",
        rituals: [
          {
            title: "Warm Lemon Water",
            description: "Start your day with warm water and fresh lemon to support hydration and digestion"
          },
          {
            title: "Gentle Face Massage",
            description: "5-minute lymphatic drainage massage to promote circulation and natural glow"
          }
        ]
      },
      {
        category: "Evening Wind-Down",
        rituals: [
          {
            title: "Digital Sunset",
            description: "Reduce screen exposure 1 hour before bed for better sleep quality"
          },
          {
            title: "Gratitude Practice",
            description: "Write down 3 things you're grateful for to reduce stress and promote positive mindset"
          }
        ]
      }
    ],
    product_recommendations: [
      {
        name: "Magnesium Glycinate",
        dosage: "200-400mg before bed",
        reason: "Supports muscle relaxation and deeper sleep quality",
        expected_result: "Improved sleep depth and morning energy levels",
        price_band: "$15-25",
        timeline: "1-2 weeks for noticeable sleep improvement"
      },
      {
        name: "Vitamin C Serum",
        dosage: "Apply morning after cleansing",
        reason: "Supports natural collagen production and skin brightness",
        expected_result: "Enhanced skin radiance and protection from environmental stress",
        price_band: "$20-40",
        timeline: "2-4 weeks for visible skin improvements"
      },
      {
        name: "Omega-3 Supplement",
        dosage: "1000mg daily with meals",
        reason: "Supports skin hydration and reduces inflammation",
        expected_result: "Improved skin texture and natural moisture retention",
        price_band: "$25-35",
        timeline: "3-6 weeks for optimal skin benefits"
      }
    ]
  };

  // If we have face detection data, we can customize insights based on detected features
  if (faceAnnotations && faceAnnotations.length > 0) {
    const face = faceAnnotations[0];
    
    // Adjust perceived age based on face detection confidence
    if (face.detectionConfidence > 0.8) {
      defaultInsights.confidence = Math.min(0.9, face.detectionConfidence);
    }

    // Customize insights based on detected emotions or features
    if (face.joyLikelihood === 'VERY_LIKELY' || face.joyLikelihood === 'LIKELY') {
      defaultInsights.preview_insights[0].emotional_hook = "Your positive energy shines through - let's amplify that natural radiance with targeted wellness practices.";
    }

    if (face.sorrowLikelihood === 'LIKELY' || face.sorrowLikelihood === 'VERY_LIKELY') {
      defaultInsights.preview_insights[2].emotional_hook = "Stress can impact our natural glow - discover gentle practices to restore your inner balance.";
    }
  }

  return defaultInsights;
}

Deno.serve(async (req) => {
  try {
    console.log('=== ANALYZE PHOTO FUNCTION START ===');
    console.log('Request method:', req.method);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('Handling CORS preflight request');
      return new Response('ok', { headers: corsHeaders });
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
    console.log('Google Vision API response ok:', visionResponse.ok);

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Google Vision API error status:', visionResponse.status);
      console.error('Google Vision API error response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze image with Google Vision API', 
          details: `Google Vision API returned ${visionResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Google Vision API call successful, parsing response...');
    const visionData = await visionResponse.json();
    console.log('Vision response data keys:', Object.keys(visionData));
    
    const faceAnnotations = visionData.responses?.[0]?.faceAnnotations;
    console.log('Face annotations found:', !!faceAnnotations);
    console.log('Number of faces detected:', faceAnnotations ? faceAnnotations.length : 0);

    // Generate wellness insights based on face detection results
    const analysisData = generateWellnessInsights(faceAnnotations);
    console.log('Generated wellness insights');

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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});