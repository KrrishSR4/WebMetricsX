/* eslint-disable no-undef */
// This service worker is required for Firebase Cloud Messaging background notifications.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// These values will be filled once the user provides the config.
firebase.initializeApp({
    apiKey: "AIzaSyDQJ1yIGrllAh_OxJBab7HPofCEPCn_POQ",
    authDomain: "webmetricsx.firebaseapp.com",
    projectId: "webmetricsx",
    storageBucket: "webmetricsx.firebasestorage.app",
    messagingSenderId: "1028824905797",
    appId: "1:1028824905797:web:9dfbcddf625c0793b44b2c",
    measurementId: "G-J7BXQBTY5X"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
