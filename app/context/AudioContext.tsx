'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AudioContextType {
  audioFile: Blob | File | null;
  setAudioFile: (file: Blob | File | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [audioFile, setAudioFile] = useState<Blob | File | null>(null);

  return (
    <AudioContext.Provider value={{ audioFile, setAudioFile }}>
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
