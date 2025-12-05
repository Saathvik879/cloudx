const admin = require('firebase-admin');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyALDRn4TwSM7sQJdx6JvMtA8cNTV9HKo4w",
    authDomain: "cloudx-e928c.firebaseapp.com",
    projectId: "cloudx-e928c",
    storageBucket: "cloudx-e928c.firebasestorage.app",
    messagingSenderId: "740963746184",
    appId: "1:740963746184:web:1ee94d55318759a94bba3d",
    measurementId: "G-R0Y3YTD1EL"
};

// Initialize Firebase Admin (for backend)
// Note: You'll need to download service account key from Firebase Console
// and set GOOGLE_APPLICATION_CREDENTIALS environment variable
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId
    });
} catch (error) {
    console.log('Firebase Admin initialization skipped:', error.message);
}

module.exports = { firebaseConfig, admin };
