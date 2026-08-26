import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  new URL(normalized);
  return normalized;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fcm_token, url, enabled } = await req.json();

    if (!fcm_token || typeof fcm_token !== 'string') {
      return new Response(JSON.stringify({ error: 'FCM token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedUrl = normalizeUrl(url);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (enabled === false) {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ enabled: false })
        .eq('fcm_token', fcm_token)
        .eq('url', normalizedUrl);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, enabled: false, url: normalizedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('monitoring_alerts')
      .upsert(
        {
          fcm_token,
          url: normalizedUrl,
          enabled: true,
        },
        { onConflict: 'fcm_token,url' },
      )
      .select('id, url, enabled')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        enabled: true,
        alert: data,
        message: 'Background alerts registered. You will receive push notifications even when this tab is closed.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('register-alert error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
