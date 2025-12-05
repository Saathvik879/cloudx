// Firebase configuration
// To use: Create a Firebase project at https://console.firebase.google.com
// Enable Google Sign-In in Authentication
// Add your config here

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "cloudx-xxxxx.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "cloudx-xxxxx",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "cloudx-xxxxx.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.FIREBASE_APP_ID || "1:123456789:web:xxxxx"
};

module.exports = firebaseConfig;
