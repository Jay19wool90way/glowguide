import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const openaiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-5'; // Default to gpt-5 if not specified

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a temporary UUID for client-side tracking
function generateTempId(): string {
  return 'temp_' + crypto.randomUUID();
}

Deno.serve(async (req) => {
  try {
    console.log('=== ANALYZE PHOTO FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);

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

    // Verify OpenAI API key is available
    console.log('Checking OpenAI API key...');
    console.log('OpenAI API key exists:', !!openaiApiKey);
    console.log('OpenAI API key length:', openaiApiKey ? openaiApiKey.length : 0);
    console.log('OpenAI API key starts with sk-:', openaiApiKey ? openaiApiKey.startsWith('sk-') : false);
    console.log('OpenAI model configured:', openaiModel);
    
    if (!openaiApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    console.log('Parsing request body...');
    const { imageData } = await req.json();
    console.log('Image data received:', !!imageData);
    console.log('Image data type:', typeof imageData);
    console.log('Image data length:', imageData ? imageData.length : 0);
    console.log('Image data starts with data:image:', imageData ? imageData.startsWith('data:image') : false);
    
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

    // Call OpenAI GPT-4 Vision API directly with base64 image
    console.log('Making request to OpenAI API...');
    console.log('OpenAI API URL: https://api.openai.com/v1/chat/completions');
    console.log('Using OpenAI model:', openaiModel);
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this person's face for wellness insights. Provide a JSON response with the following structure:
                {
                  "perceived_age": number,
                  "confidence": number (0-1),
                  "preview_insights": [
                    {
                      "star_rating": number (1-5),
                      "emotional_hook": "string",
                      "conversion_tease": "string",
                      "category": "string"
                    }
                  ],
                  "detailed_analysis": {
                    "wellness_age": {
                      "perceived_age": number,
                      "confidence": number,
                      "detailed_observations": ["string"],
                      "root_causes": ["string"],
                      "improvement_timeline": "string"
                    },
                    "facial_features": {
                      "skin_analysis": {
                        "observation": "string",
                        "potential_causes": ["string"],
                        "root_connection": "string",
                        "protocol": "string",
                        "timeline": "string"
                      },
                      "eye_area": {
                        "observation": "string",
                        "potential_causes": ["string"],
                        "root_connection": "string",
                        "protocol": "string",
                        "timeline": "string"
                      },
                      "lip_analysis": {
                        "observation": "string",
                        "potential_causes": ["string"],
                        "root_connection": "string",
                        "protocol": "string",
                        "timeline": "string"
                      },
                      "jaw_tension": {
                        "observation": "string",
                        "potential_causes": ["string"],
                        "root_connection": "string",
                        "protocol": "string",
                        "timeline": "string"
                      }
                    }
                  },
                  "daily_rituals": [
                    {
                      "category": "string",
                      "rituals": [
                        {
                          "title": "string",
                          "description": "string"
                        }
                      ]
                    }
                  ],
                  "product_recommendations": [
                    {
                      "name": "string",
                      "dosage": "string",
                      "reason": "string",
                      "expected_result": "string",
                      "price_band": "string",
                      "timeline": "string"
                    }
                  ]
                }
                
                Focus on wellness insights, not medical diagnosis. Be encouraging and specific about improvements.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_completion_tokens: 2000,
        temperature: 1
      })
    });

    console.log('OpenAI response status:', openaiResponse.status);
    console.log('OpenAI response ok:', openaiResponse.ok);
    console.log('OpenAI response headers:', Object.fromEntries(openaiResponse.headers.entries()));

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error status:', openaiResponse.status);
      console.error('OpenAI API error response:', errorText);
      console.error('OpenAI API error headers:', Object.fromEntries(openaiResponse.headers.entries()));
      
      // Try to parse error response for more details
      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed OpenAI error data:', JSON.stringify(errorData, null, 2));
        if (errorData.error) {
          console.error('OpenAI error type:', errorData.error.type);
          console.error('OpenAI error code:', errorData.error.code);
          console.error('OpenAI error message:', errorData.error.message);
        }
      } catch (parseError) {
        console.error('Could not parse OpenAI error response as JSON');
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze image', 
          details: `OpenAI API returned ${openaiResponse.status}: ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI API call successful, parsing response...');
    const openaiData = await openaiResponse.json();
    console.log('OpenAI response data keys:', Object.keys(openaiData));
    console.log('OpenAI choices length:', openaiData.choices ? openaiData.choices.length : 0);
    
    const analysisContent = openaiData.choices[0]?.message?.content;
    console.log('Analysis content received:', !!analysisContent);
    console.log('Analysis content length:', analysisContent ? analysisContent.length : 0);

    if (!analysisContent) {
      console.error('No analysis content in OpenAI response');
      console.error('Full OpenAI response:', JSON.stringify(openaiData, null, 2));
      return new Response(
        JSON.stringify({ error: 'No analysis received from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response from OpenAI
    console.log('Parsing analysis content as JSON...');
    let analysisData;
    try {
      analysisData = JSON.parse(analysisContent);
      console.log('Successfully parsed analysis data');
      console.log('Analysis data keys:', Object.keys(analysisData));
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw analysis content:', analysisContent);
      return new Response(
        JSON.stringify({ error: 'Invalid analysis format received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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