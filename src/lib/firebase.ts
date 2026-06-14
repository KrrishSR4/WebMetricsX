import { initializeApp, getApps } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type MessagePayload,
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messagingInstance: ReturnType<typeof getMessaging> | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

export const registerMessagingServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    serviceWorkerRegistration = registration;
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
};

const getMessagingInstance = async () => {
  if (messagingInstance) return messagingInstance;

  const supported = await isSupported();
  if (!supported) {
    console.warn('Firebase Messaging is not supported in this browser');
    return null;
  }

  if (!serviceWorkerRegistration) {
    await registerMessagingServiceWorker();
  }

  messagingInstance = getMessaging(app);
  return messagingInstance;
};

export const requestNotificationPermission = async (vapidKey: string) => {
  try {
    if (!vapidKey) {
      console.warn('VITE_FIREBASE_VAPID_KEY is not configured');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = serviceWorkerRegistration ?? (await registerMessagingServiceWorker());
    const messaging = await getMessagingInstance();
    if (!messaging || !registration) return null;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  let unsubscribe = () => {};
  getMessagingInstance().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, callback);
    }
  });
  return () => unsubscribe();
};

async function showNotificationViaServiceWorker(
  title: string,
  body: string,
  tag: string,
  requireInteraction = false,
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  const registration = serviceWorkerRegistration ?? (await registerMessagingServiceWorker());
  if (!registration) return false;

  if (registration.active) {
    registration.active.postMessage({
      type: 'SHOW_DOWNTIME_ALERT',
      title,
      body,
      tag,
      requireInteraction,
    });
    return true;
  }

  await registration.showNotification(title, {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag,
    requireInteraction,
  });
  return true;
}

export const showDowntimeNotification = async (url: string, status: string) => {
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  if (status === 'down') {
    await showNotificationViaServiceWorker(
      '⚠️ Website Down!',
      `${hostname} is not responding. Immediate attention required.`,
      `downtime-${hostname}`,
      true,
    );
    return;
  }

  if (status === 'degraded') {
    await showNotificationViaServiceWorker(
      '⚡ Performance Degraded',
      `${hostname} is experiencing slow response times (>400ms).`,
      `degraded-${hostname}`,
    );
  }
};

export const registerBackgroundAlert = async (fcmToken: string, url: string) => {
  const { supabase } = await import('@/integrations/supabase/client');

  const { data, error } = await supabase.functions.invoke('register-alert', {
    body: {
      fcm_token: fcmToken,
      url,
      enabled: true,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data;
};

export const unregisterBackgroundAlert = async (fcmToken: string, url: string) => {
  const { supabase } = await import('@/integrations/supabase/client');

  const { data, error } = await supabase.functions.invoke('register-alert', {
    body: {
      fcm_token: fcmToken,
      url,
      enabled: false,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data;
};
