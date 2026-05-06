import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyDQJ1yIGrllAh_OxJBab7HPofCEPCn_POQ",
    authDomain: "webmetricsx.firebaseapp.com",
    projectId: "webmetricsx",
    storageBucket: "webmetricsx.firebasestorage.app",
    messagingSenderId: "1028824905797",
    appId: "1:1028824905797:web:9dfbcddf625c0793b44b2c",
    measurementId: "G-J7BXQBTY5X"
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

export const onForegroundMessage = (callback: (payload: any) => void) => {
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
