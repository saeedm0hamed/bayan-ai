'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type RecognitionResult = {
  surah_number?: number;
  ayah_number?: number;
  similarity_score?: number;
  best_similarity?: number;
  possible_match?: {
    surah_number?: number;
    ayah_number?: number;
    similarity_score?: number;
    surah_name?: string;
    verse_text?: string;
  };
  matches?: {
    surah_number?: number;
    ayah_number?: number;
    similarity_score?: number;
    surah_name?: string;
    verse_text?: string;
  }[];
  surah_name?: string;
  verse_text?: string;
  confidence?: number;
};

interface AudioContextType {
  audioFile: Blob | File | null;
  setAudioFile: (file: Blob | File | null) => void;
  recognitionResult: RecognitionResult | null;
  setRecognitionResult: (result: RecognitionResult | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [audioFile, setAudioFile] = useState<Blob | File | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);

  return (
    <AudioContext.Provider value={{ audioFile, setAudioFile, recognitionResult, setRecognitionResult }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
