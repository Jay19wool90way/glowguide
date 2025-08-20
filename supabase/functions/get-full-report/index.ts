import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has active subscription
    const { data: subscription, error: subError } = await supabase
      .from('stripe_user_subscriptions')
      .select('subscription_status')
      .maybeSingle();

    if (subError) {
      console.error('Subscription check error:', subError);
    }

    const hasActiveSubscription = subscription?.subscription_status === 'active' || 
                                 subscription?.subscription_status === 'trialing';

    if (!hasActiveSubscription) {
      return new Response(
        JSON.stringify({ error: 'Active subscription required to access full report' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get analysis ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const analysisId = pathParts[pathParts.length - 1];

    if (!analysisId) {
      return new Response(
        JSON.stringify({ error: 'Analysis ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch analysis from database
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id) // Ensure user can only access their own analyses
      .single();

    if (fetchError) {
      console.error('Fetch analysis error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if analysis has expired
    const now = new Date();
    const expiresAt = new Date(analysis.expires_at);
    
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Analysis has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the full analysis data
    return new Response(
      JSON.stringify({
        analysis_id: analysis.id,
        image_url: analysis.image_url,
        analysis_data: analysis.analysis_data,
        created_at: analysis.created_at,
        expires_at: analysis.expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get full report error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});