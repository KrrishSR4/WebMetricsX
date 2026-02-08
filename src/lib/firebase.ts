import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Ye config user jab dega tab replace karenge
const firebaseConfig = {
    apiKey: "AIzaSyDQJ1yIGrllAh_OxJBab7HPofCEPCn_POQ",
    authDomain: "webmetricsx.firebaseapp.com",
    projectId: "webmetricsx",
    storageBucket: "webmetricsx.firebasestorage.app",
    messagingSenderId: "1028824905797",
    appId: "1:1028824905797:web:9dfbcddf625c0793b44b2c",
    measurementId: "G-J7BXQBTY5X"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async (vapidKey: string) => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
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
    return onMessage(messaging, callback);
};
