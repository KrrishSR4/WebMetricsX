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
  const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

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

    // Enable - first ensure we have browser notification permission
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

    // Try to get FCM token in background if not already present, but don't block local notification enabling
    if (!token) {
      requestNotificationPermission(VAPID_KEY).then((fcmToken) => {
        if (fcmToken) {
          setToken(fcmToken);
          localStorage.setItem('fcm_token', fcmToken);
        }
      }).catch((err) => {
        console.warn('Firebase FCM token registration skipped/failed:', err);
      });
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

    // Trigger alert if status changed, OR if this is the first check and status is down/degraded
    const isStatusChanged = prevStatus !== null && prevStatus !== currentStatus;
    const isFirstCheckAndAlerting = prevStatus === null && (currentStatus === 'down' || currentStatus === 'degraded');

    if (isStatusChanged || isFirstCheckAndAlerting) {
      if (currentStatus === 'down') {
        showDowntimeNotification(url, 'down');
        toast.error(`🚨 ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} is DOWN!`, { duration: 10000 });
      } else if (currentStatus === 'degraded') {
        showDowntimeNotification(url, 'degraded');
        toast.warning(`⚡ ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} is experiencing issues (Response time: >400ms)`, { duration: 8000 });
      } else if (currentStatus === 'up' && prevStatus && (prevStatus === 'down' || prevStatus === 'degraded')) {
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
