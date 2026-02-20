 'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBpACa7EPg0HeBJffTPzxkvp-CIewX5jLU',
  authDomain: 'bayan-8a6a1.firebaseapp.com',
  projectId: 'bayan-8a6a1',
  storageBucket: 'bayan-8a6a1.firebasestorage.app',
  messagingSenderId: '453977686264',
  appId: '1:453977686264:web:347ea2ad0125dc78787b0d',
  measurementId: 'G-QNMR5F4S9Q',
};

const getFirebaseApp = () => (getApps().length ? getApp() : initializeApp(firebaseConfig));

let analyticsInstance: Analytics | null = null;
let analyticsInitializationPromise: Promise<Analytics | null> | null = null;
let firestoreInstance: Firestore | null = null;

const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  if (analyticsInitializationPromise) {
    return analyticsInitializationPromise;
  }

  analyticsInitializationPromise = (async () => {
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      return null;
    }

    const app = getFirebaseApp();
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  })();

  return analyticsInitializationPromise;
};

const getFirestoreInstance = (): Firestore => {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const app = getFirebaseApp();
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
};

export interface SurahRecognizedEventParams {
  surah: string;
  surahNumber: string;
  ayahNumber: string;
  confidence: number;
  duration: string;
  similarity: number;
}

export const logSurahRecognized = async (params: SurahRecognizedEventParams): Promise<void> => {
  try {
    const analytics = await getAnalyticsInstance();
    if (!analytics) {
      return;
    }

    const payload = {
      surah: params.surah,
      surah_number: params.surahNumber,
      ayah_number: params.ayahNumber,
      confidence: params.confidence,
      duration: params.duration,
      similarity: params.similarity,
      debug_mode: process.env.NODE_ENV === 'development',
    };

    logEvent(analytics, 'surah_recognized', {
      surah: payload.surah,
      surah_number: payload.surah_number,
      ayah_number: payload.ayah_number,
      confidence: payload.confidence,
      duration: payload.duration,
      similarity: payload.similarity,
      debug_mode: payload.debug_mode,
    });
  } catch {
    // Ignore analytics errors
  }
};

const SURAH_STATS_COLLECTION = 'stats';
const SURAH_STATS_DOCUMENT = 'global';

export const incrementSurahRecognizedCount = async (): Promise<void> => {
  const db = getFirestoreInstance();
  const ref = doc(db, SURAH_STATS_COLLECTION, SURAH_STATS_DOCUMENT);
  try {
    await updateDoc(ref, {
      surah_recognized_count: increment(1),
    });
  } catch {
    await setDoc(
      ref,
      {
        surah_recognized_count: increment(1),
      },
      { merge: true },
    );
  }
};

export const getSurahRecognizedCount = async (): Promise<number> => {
  const db = getFirestoreInstance();
  const ref = doc(db, SURAH_STATS_COLLECTION, SURAH_STATS_DOCUMENT);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return 0;
  }
  const data = snapshot.data() as { surah_recognized_count?: number } | undefined;
  return data?.surah_recognized_count ?? 0;
};
