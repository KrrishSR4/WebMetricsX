import { useState, useEffect } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { toast } from 'sonner';

export const useNotifications = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('fcm_token'));
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (!('Notification' in window)) {
            setIsSupported(false);
            return;
        }

        // Handle foreground messages
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
            toast.success('Notifications enabled successfully!');
            return true;
        } else {
            toast.error('Failed to enable notifications. Please check permissions.');
            return false;
        }
    };

    return {
        token,
        isSupported,
        enableNotifications
    };
};
