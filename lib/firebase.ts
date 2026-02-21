import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously, type User, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBpACa7EPg0HeBJffTPzxkvp-CIewX5jLU",
  authDomain: "bayan-8a6a1.firebaseapp.com",
  projectId: "bayan-8a6a1",
  storageBucket: "bayan-8a6a1.firebasestorage.app",
  messagingSenderId: "453977686264",
  appId: "1:453977686264:web:347ea2ad0125dc78787b0d",
  measurementId: "G-QNMR5F4S9Q"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);

let analytics: Analytics | null = null;
let auth: Auth | null = null;

const initAuth = () => {
  if (typeof window === "undefined") return null;
  if (!auth) {
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
};

const ensureAnonymousUser = async (): Promise<User | null> => {
  const authInstance = initAuth();
  if (!authInstance) return null;

  if (authInstance.currentUser) {
    return authInstance.currentUser;
  }

  try {
    const credential = await signInAnonymously(authInstance);
    return credential.user;
  } catch {
    return null;
  }
};

if (typeof window !== "undefined") {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

export { app, db, analytics, auth, ensureAnonymousUser };

