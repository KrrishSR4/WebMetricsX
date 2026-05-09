import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

const getMessagingInstance = async () => {
    if (messagingInstance) return messagingInstance;
    const supported = await isSupported();
    if (!supported) {
        console.warn("Firebase Messaging is not supported in this browser");
        return null;
    }
    messagingInstance = getMessaging(app);
    return messagingInstance;
};

export const requestNotificationPermission = async (vapidKey: string) => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const messaging = await getMessagingInstance();
            if (!messaging) return null;
            const token = await getToken(messaging, { vapidKey });
            console.log("FCM Token:", token);
            return token;
        }
    } catch (error) {
        console.error("An error occurred while retrieving token:", error);
    }
    return null;
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

// Browser notification helper for downtime alerts
export const showDowntimeNotification = (url: string, status: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const hostname = (() => {
        try { return new URL(url).hostname; } catch { return url; }
    })();

    if (status === 'down') {
        new Notification('⚠️ Website Down!', {
            body: `${hostname} is not responding. Immediate attention required.`,
            icon: '/favicon.png',
            tag: `downtime-${hostname}`,
            requireInteraction: true,
        });
    } else if (status === 'degraded') {
        new Notification('⚡ Performance Degraded', {
            body: `${hostname} is experiencing slow response times.`,
            icon: '/favicon.png',
            tag: `degraded-${hostname}`,
        });
    }
};
