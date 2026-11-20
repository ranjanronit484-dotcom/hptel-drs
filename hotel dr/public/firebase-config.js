// =================================================================
// HOTEL DRS DELUXE - FIREBASE CONFIGURATION & INITIALIZATION
// Project: hotel-drs-deluxe
// =================================================================

const firebaseConfig = {
  apiKey: "AIzaSyD935mOjxHDuRk3yQLwvgVhwGyijG86EpI",
  authDomain: "hotel-drs-deluxe.firebaseapp.com",
  projectId: "hotel-drs-deluxe",
  storageBucket: "hotel-drs-deluxe.firebasestorage.app",
  messagingSenderId: "399193746713",
  appId: "1:399193746713:web:0b4dbca9c2d1333c2e6988",
  measurementId: "G-C0B975VH7R"
};

// Initialize Firebase Compatibility SDK
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.db = firebase.firestore();
  console.log('🔥 Firebase Initialized: Connected to Firestore project "hotel-drs-deluxe"');
} else {
  console.warn('Firebase SDK not loaded in page');
}
