import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { buildAlertMessage, sendPushNotification } from '../_shared/fcm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type AlertStatus = 'up' | 'down' | 'degraded';

interface MonitoringAlert {
  id: string;
  fcm_token: string;
  url: string;
  enabled: boolean;
  last_status: AlertStatus | null;
  last_response_time: number | null;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function checkWebsiteStatus(
  url: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ status: AlertStatus; responseTime: number | null }> {
  const response = await fetch(`${supabaseUrl}/functions/v1/monitor-website`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    return { status: 'down', responseTime: null };
  }

  const data = await response.json();
  let status = (data?.website?.status ?? 'down') as AlertStatus;
  const responseTime = typeof data?.website?.responseTime === 'number' ? data.website.responseTime : null;

  if (status === 'up' && responseTime !== null && responseTime > 400) {
    status = 'degraded';
  }

  return { status, responseTime };
}

function shouldNotify(previousStatus: AlertStatus | null, currentStatus: AlertStatus): boolean {
  if (previousStatus === null) {
    return currentStatus === 'down' || currentStatus === 'degraded';
  }

  if (previousStatus !== currentStatus) {
    if (currentStatus === 'down' || currentStatus === 'degraded') return true;
    if (currentStatus === 'up' && (previousStatus === 'down' || previousStatus === 'degraded')) return true;
  }

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: alerts, error } = await supabase
      .from('monitoring_alerts')
      .select('id, fcm_token, url, enabled, last_status, last_response_time')
      .eq('enabled', true);

    if (error) throw error;

    const results: Array<{ id: string; url: string; status: AlertStatus; notified: boolean }> = [];

    for (const alert of (alerts ?? []) as MonitoringAlert[]) {
      const { status, responseTime } = await checkWebsiteStatus(alert.url, supabaseUrl, serviceRoleKey);
      const notify = shouldNotify(alert.last_status, status);

      let notified = false;

      if (notify) {
        const hostname = hostnameFromUrl(alert.url);
        const { title, body } = buildAlertMessage(hostname, status, responseTime);

        notified = await sendPushNotification(alert.fcm_token, title, body, {
          url: alert.url,
          status,
          responseTime: responseTime?.toString() ?? '',
        });
      }

      await supabase
        .from('monitoring_alerts')
        .update({
          last_status: status,
          last_response_time: responseTime,
          ...(notified ? { last_notified_at: new Date().toISOString() } : {}),
        })
        .eq('id', alert.id);

      results.push({ id: alert.id, url: alert.url, status, notified });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('check-alerts error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
