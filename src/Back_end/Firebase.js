import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCqtC4nsajiHWzjgDQ-LjKE9XJkKOXwvKA",
  authDomain: "itech-5d38b.firebaseapp.com",
  databaseURL: "https://itech-5d38b-default-rtdb.firebaseio.com",
  projectId: "itech-5d38b",
  storageBucket: "itech-5d38b.firebasestorage.app",
  messagingSenderId: "680648884103",
  appId: "1:680648884103:web:139c6812fb2cc54f239d22",
  measurementId: "G-CFEK8NJG9Y"
};
const app = initializeApp(firebaseConfig);
export const firebaseApiKey = firebaseConfig.apiKey;
export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const rtdb      = getDatabase(app);   // ← Realtime Database
export const analytics = getAnalytics(app);
export default app;