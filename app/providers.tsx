'use client';

import { AudioProvider } from './context/AudioContext';
import { ThemeProvider } from './context/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AudioProvider>{children}</AudioProvider>
    </ThemeProvider>
  );
}
