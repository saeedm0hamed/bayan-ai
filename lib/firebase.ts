 'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyBpACa7EPg0HeBJffTPzxkvp-CIewX5jLU',
  authDomain: 'bayan-8a6a1.firebaseapp.com',
  projectId: 'bayan-8a6a1',
  storageBucket: 'bayan-8a6a1.firebasestorage.app',
  messagingSenderId: '453977686264',
  appId: '1:453977686264:web:347ea2ad0125dc78787b0d',
  measurementId: 'G-QNMR5F4S9Q',
};

let analyticsInstance: Analytics | null = null;
let initializationPromise: Promise<Analytics | null> | null = null;

const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      return null;
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  })();

  return initializationPromise;
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

    logEvent(analytics, 'surah_recognized', {
      surah: params.surah,
      surah_number: params.surahNumber,
      ayah_number: params.ayahNumber,
      confidence: params.confidence,
      duration: params.duration,
      similarity: params.similarity,
    });
  } catch {
    // Ignore analytics errors
  }
};

