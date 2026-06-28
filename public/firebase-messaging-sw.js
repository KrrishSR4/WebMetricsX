// Firebase Cloud Messaging service worker — background push + local alert relay
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDQJ1yIGrllAh_OxJBab7HPofCEPCn_POQ',
  authDomain: 'webmetricsx.firebaseapp.com',
  projectId: 'webmetricsx',
  storageBucket: 'webmetricsx.firebasestorage.app',
  messagingSenderId: '1028824905797',
  appId: '1:1028824905797:web:9dfbcddf625c0793b44b2c',
  measurementId: 'G-J7BXQBTY5X',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'WebMetricsX Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'Your website status changed.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: payload.data?.url ? `alert-${payload.data.url}` : 'webmetricsx-alert',
    data: payload.data || {},
    requireInteraction: payload.data?.status === 'down',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('message', (event) => {
  const sourceUrl = event.source?.url;
  if (!sourceUrl) return;

  let sourceOrigin;
  try {
    sourceOrigin = new URL(sourceUrl).origin;
  } catch (_) {
    return;
  }

  if (sourceOrigin !== self.location.origin) return;
  if (event.data?.type !== 'SHOW_DOWNTIME_ALERT') return;

  const { title, body, tag, requireInteraction } = event.data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: tag || 'webmetricsx-local-alert',
      requireInteraction: Boolean(requireInteraction),
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/monitor');
      }
    }),
  );
});
