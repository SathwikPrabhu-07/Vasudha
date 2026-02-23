// Firebase configuration for Vasudha
import { initializeApp } from "firebase/app";
import { getAuth, browserSessionPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDrbiUA83lMbcfJE9EJy2NfT5OBy2STIeY",
    authDomain: "vasudha-a1215.firebaseapp.com",
    projectId: "vasudha-a1215",
    storageBucket: "vasudha-a1215.firebasestorage.app",
    messagingSenderId: "460932310778",
    appId: "1:460932310778:web:001f71a7c9d50941bccb43",
    measurementId: "G-TPPB1G832B",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Use per-tab session persistence so multiple logins in different tabs
// don't overwrite each other (default is localStorage = shared across tabs)
setPersistence(auth, browserSessionPersistence);

export default app;

