// Shared Firebase web config — env vars override defaults for local dev.
// Defaults match public/firebase-messaging-sw.js so production builds work
// even when VITE_* vars are not injected at build time.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDQJ1yIGrllAh_OxJBab7HPofCEPCn_POQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'webmetricsx.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'webmetricsx',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'webmetricsx.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1028824905797',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1028824905797:web:9dfbcddf625c0793b44b2c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-J7BXQBTY5X',
};

export const firebaseVapidKey =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BH7il3h8Jar5rjx8l0HKLbBkL8Pa0Kd1ikj2vsx1LsKGKswawRTsZ6XT-3_s8Ugi-hRTTuVCdLM4spQtauavodU';
