import { useState, useEffect, useRef, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage, showDowntimeNotification } from '@/lib/firebase';
import { toast } from 'sonner';

export const useNotifications = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('fcm_token'));
    const [isSupported, setIsSupported] = useState(true);
    const prevStatusRef = useRef<string | null>(null);

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

    const enableNotifications = async (vapidKey: string) => {
        const fcmToken = await requestNotificationPermission(vapidKey);
        if (fcmToken) {
            setToken(fcmToken);
            localStorage.setItem('fcm_token', fcmToken);
            toast.success('Notifications enabled! You will get alerts when a site goes down.');
            return true;
        } else {
            toast.error('Failed to enable notifications. Please check permissions.');
            return false;
        }
    };

    // Call this from monitoring hook to check status changes
    const checkStatusChange = useCallback((url: string, currentStatus: string) => {
        if (!token) return; // notifications not enabled
        
        const prevStatus = prevStatusRef.current;
        
        if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === 'down') {
                showDowntimeNotification(url, 'down');
                toast.error(`🚨 ${new URL(url).hostname} is DOWN!`, {
                    duration: 10000,
                });
            } else if (currentStatus === 'degraded') {
                showDowntimeNotification(url, 'degraded');
                toast.warning(`⚡ ${new URL(url).hostname} is experiencing issues`, {
                    duration: 8000,
                });
            } else if (currentStatus === 'up' && (prevStatus === 'down' || prevStatus === 'degraded')) {
                toast.success(`✅ ${new URL(url).hostname} is back UP!`, {
                    duration: 5000,
                });
            }
        }
        
        prevStatusRef.current = currentStatus;
    }, [token]);

    return {
        token,
        isSupported,
        enableNotifications,
        checkStatusChange,
    };
};
