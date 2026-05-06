import { useState, useEffect, useRef, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage, showDowntimeNotification } from '@/lib/firebase';
import { toast } from 'sonner';

const STORAGE_KEY = 'webmetricsx_notification_urls';

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

export const useNotifications = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('fcm_token'));
  const [isSupported, setIsSupported] = useState(true);
  const [enabledUrls, setEnabledUrls] = useState<string[]>(getEnabledUrls);
  const prevStatusRef = useRef<string | null>(null);

  // VAPID key
  const VAPID_KEY = "BBoovMWQMAx1yoUjgIr8ym1RyPJEBTdKNM5tkQj77chTcs6uKDJsz7SAaQRYorthEJHLmi26XRGqy5lf3Ung3Wc";

  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);
      toast(payload.notification?.title || 'Notification', {
        description: payload.notification?.body,
      });
    });

    return () => unsubscribe();
  }, []);

  const toggleNotificationForUrl = useCallback(async (url: string) => {
    const isEnabled = enabledUrls.includes(url);
    
    if (isEnabled) {
      // Disable for this URL
      const updated = enabledUrls.filter(u => u !== url);
      setEnabledUrls(updated);
      saveEnabledUrls(updated);
      toast.info(`Notifications disabled for ${(() => { try { return new URL(url).hostname; } catch { return url; } })()}`);
      return;
    }

    // Enable - first ensure we have permission + token
    if (!token) {
      const fcmToken = await requestNotificationPermission(VAPID_KEY);
      if (fcmToken) {
        setToken(fcmToken);
        localStorage.setItem('fcm_token', fcmToken);
      } else {
        toast.error('Failed to enable notifications. Please check browser permissions.');
        return;
      }
    }

    const updated = [...enabledUrls, url];
    setEnabledUrls(updated);
    saveEnabledUrls(updated);
    toast.success(`Downtime alerts enabled for ${(() => { try { return new URL(url).hostname; } catch { return url; } })()}`);
  }, [enabledUrls, token, VAPID_KEY]);

  const isNotificationEnabledForUrl = useCallback((url: string) => {
    return enabledUrls.includes(url);
  }, [enabledUrls]);

  const checkStatusChange = useCallback((url: string, currentStatus: string) => {
    if (!enabledUrls.includes(url)) {
      prevStatusRef.current = currentStatus;
      return;
    }

    const prevStatus = prevStatusRef.current;

    if (prevStatus && prevStatus !== currentStatus) {
      if (currentStatus === 'down') {
        showDowntimeNotification(url, 'down');
        toast.error(`🚨 ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} is DOWN!`, { duration: 10000 });
      } else if (currentStatus === 'degraded') {
        showDowntimeNotification(url, 'degraded');
        toast.warning(`⚡ ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} is experiencing issues`, { duration: 8000 });
      } else if (currentStatus === 'up' && (prevStatus === 'down' || prevStatus === 'degraded')) {
        toast.success(`✅ ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} is back UP!`, { duration: 5000 });
      }
    }

    prevStatusRef.current = currentStatus;
  }, [enabledUrls]);

  return {
    token,
    isSupported,
    enabledUrls,
    toggleNotificationForUrl,
    isNotificationEnabledForUrl,
    checkStatusChange,
  };
};
