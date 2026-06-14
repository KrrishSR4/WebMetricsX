import { useState, useEffect, useRef, useCallback } from 'react';
import {
  registerBackgroundAlert,
  registerMessagingServiceWorker,
  requestNotificationPermission,
  onForegroundMessage,
  showDowntimeNotification,
  unregisterBackgroundAlert,
} from '@/lib/firebase';
import { toast } from 'sonner';

const STORAGE_KEY = 'webmetricsx_notification_urls';
const SERVER_ALERTS_KEY = 'webmetricsx_server_alerts';

function getEnabledUrls(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveEnabledUrls(urls: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
}

function getServerRegisteredUrls(): string[] {
  try {
    const stored = localStorage.getItem(SERVER_ALERTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveServerRegisteredUrls(urls: string[]) {
  localStorage.setItem(SERVER_ALERTS_KEY, JSON.stringify(urls));
}

export const useNotifications = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('fcm_token'));
  const [isSupported, setIsSupported] = useState(true);
  const [enabledUrls, setEnabledUrls] = useState<string[]>(getEnabledUrls);
  const [serverRegisteredUrls, setServerRegisteredUrls] = useState<string[]>(getServerRegisteredUrls);
  const prevStatusRef = useRef<string | null>(null);

  const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    registerMessagingServiceWorker().catch((error) => {
      console.warn('Messaging service worker setup failed:', error);
    });

    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || 'WebMetricsX Alert';
      const body = payload.notification?.body || 'Your website status changed.';
      toast(title, { description: body, duration: 10000 });
    });

    return () => unsubscribe();
  }, []);

  const toggleNotificationForUrl = useCallback(
    async (url: string) => {
      const isEnabled = enabledUrls.includes(url);

      if (isEnabled) {
        const updated = enabledUrls.filter((u) => u !== url);
        setEnabledUrls(updated);
        saveEnabledUrls(updated);

        if (token) {
          try {
            await unregisterBackgroundAlert(token, url);
            const serverUpdated = serverRegisteredUrls.filter((u) => u !== url);
            setServerRegisteredUrls(serverUpdated);
            saveServerRegisteredUrls(serverUpdated);
          } catch (err) {
            console.warn('Failed to unregister server alert:', err);
          }
        }

        toast.info(
          `Notifications disabled for ${(() => {
            try {
              return new URL(url).hostname;
            } catch {
              return url;
            }
          })()}`,
        );
        return;
      }

      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Failed to enable notifications. Please check browser permissions.');
          return;
        }
      } else {
        toast.error('Notifications are not supported in this browser.');
        return;
      }

      let fcmToken = token;
      if (!fcmToken) {
        fcmToken = await requestNotificationPermission(VAPID_KEY);
        if (fcmToken) {
          setToken(fcmToken);
          localStorage.setItem('fcm_token', fcmToken);
        }
      }

      if (!fcmToken) {
        toast.error('Could not register for push notifications. Check Firebase VAPID key configuration.');
        return;
      }

      try {
        await registerBackgroundAlert(fcmToken, url);
        const serverUpdated = [...new Set([...serverRegisteredUrls, url])];
        setServerRegisteredUrls(serverUpdated);
        saveServerRegisteredUrls(serverUpdated);
      } catch (err) {
        console.error('Server alert registration failed:', err);
        toast.error('Background alerts could not be registered on the server. Try again later.');
        return;
      }

      const updated = [...enabledUrls, url];
      setEnabledUrls(updated);
      saveEnabledUrls(updated);

      toast.success(
        `Background downtime alerts enabled for ${(() => {
          try {
            return new URL(url).hostname;
          } catch {
            return url;
          }
        })()}. You will get notifications even when this tab is closed.`,
      );
    },
    [enabledUrls, serverRegisteredUrls, token, VAPID_KEY],
  );

  const isNotificationEnabledForUrl = useCallback(
    (url: string) => enabledUrls.includes(url),
    [enabledUrls],
  );

  const checkStatusChange = useCallback(
    (url: string, currentStatus: string) => {
      if (!enabledUrls.includes(url)) {
        prevStatusRef.current = currentStatus;
        return;
      }

      const prevStatus = prevStatusRef.current;
      const isStatusChanged = prevStatus !== null && prevStatus !== currentStatus;
      const isFirstCheckAndAlerting =
        prevStatus === null && (currentStatus === 'down' || currentStatus === 'degraded');
      const usesServerPush = serverRegisteredUrls.includes(url);

      if (isStatusChanged || isFirstCheckAndAlerting) {
        const hostname = (() => {
          try {
            return new URL(url).hostname;
          } catch {
            return url;
          }
        })();

        if (currentStatus === 'down') {
          if (!usesServerPush) {
            void showDowntimeNotification(url, 'down');
          }
          toast.error(`🚨 ${hostname} is DOWN!`, { duration: 10000 });
        } else if (currentStatus === 'degraded') {
          if (!usesServerPush) {
            void showDowntimeNotification(url, 'degraded');
          }
          toast.warning(`⚡ ${hostname} is experiencing issues (Response time: >400ms)`, {
            duration: 8000,
          });
        } else if (
          currentStatus === 'up' &&
          prevStatus &&
          (prevStatus === 'down' || prevStatus === 'degraded')
        ) {
          toast.success(`✅ ${hostname} is back UP!`, { duration: 5000 });
        }
      }

      prevStatusRef.current = currentStatus;
    },
    [enabledUrls, serverRegisteredUrls],
  );

  return {
    token,
    isSupported,
    enabledUrls,
    toggleNotificationForUrl,
    isNotificationEnabledForUrl,
    checkStatusChange,
  };
};
