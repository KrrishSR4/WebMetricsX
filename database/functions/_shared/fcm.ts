const FCM_LEGACY_URL = 'https://fcm.googleapis.com/fcm/send';
const FCM_V1_BASE = 'https://fcm.googleapis.com/v1/projects';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getGoogleAccessToken(serviceAccount: ServiceAccount): Promise<string | null> {
  try {
    const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const now = Math.floor(Date.now() / 1000);
    const payload = base64UrlEncode(
      new TextEncoder().encode(
        JSON.stringify({
          iss: serviceAccount.client_email,
          sub: serviceAccount.client_email,
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
        }),
      ),
    );

    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(serviceAccount.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = base64UrlEncode(
      new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`))),
    );

    const jwt = `${header}.${payload}.${signature}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to obtain Google access token:', await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token ?? null;
  } catch (error) {
    console.error('Google access token error:', error);
    return null;
  }
}

async function sendViaLegacyApi(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<boolean> {
  const serverKey = Deno.env.get('FIREBASE_SERVER_KEY');
  if (!serverKey) return false;

  const response = await fetch(FCM_LEGACY_URL, {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body, icon: '/favicon.png' },
      data,
      priority: 'high',
    }),
  });

  if (!response.ok) {
    console.error('Legacy FCM send failed:', await response.text());
    return false;
  }

  return true;
}

async function sendViaV1Api(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<boolean> {
  const rawServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!rawServiceAccount) return false;

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
    return false;
  }

  const accessToken = await getGoogleAccessToken(serviceAccount);
  if (!accessToken) return false;

  const response = await fetch(`${FCM_V1_BASE}/${serviceAccount.project_id}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data,
        webpush: {
          notification: {
            icon: '/favicon.png',
          },
          fcm_options: {
            link: 'https://webmetricsx.web.app/monitor',
          },
        },
      },
    }),
  });

  if (!response.ok) {
    console.error('FCM v1 send failed:', await response.text());
    return false;
  }

  return true;
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<boolean> {
  const sentViaV1 = await sendViaV1Api(token, title, body, data);
  if (sentViaV1) return true;

  const sentViaLegacy = await sendViaLegacyApi(token, title, body, data);
  if (sentViaLegacy) return true;

  console.error('FCM not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVER_KEY in Supabase secrets.');
  return false;
}

export function buildAlertMessage(
  hostname: string,
  status: 'up' | 'down' | 'degraded',
  responseTime: number | null,
): { title: string; body: string } {
  if (status === 'down') {
    return {
      title: '⚠️ Website Down!',
      body: `${hostname} is not responding. Immediate attention required.`,
    };
  }

  if (status === 'degraded') {
    return {
      title: '⚡ Performance Degraded',
      body: `${hostname} response time is ${responseTime ?? 'unknown'}ms (above 400ms threshold).`,
    };
  }

  return {
    title: '✅ Website Recovered',
    body: `${hostname} is back online and responding normally.`,
  };
}
