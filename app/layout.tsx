import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Readex_Pro, Amiri_Quran } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const readex = Readex_Pro({
  variable: '--font-readex',
  subsets: ['latin'],
});

const amiri = Amiri_Quran({
  variable: '--font-amiri',
  subsets: ['latin'],
  weight: ['400'],
});

export const metadata: Metadata = {
  title: 'Bayan AI - بيان',
  description: 'Bayan AI - بيان',
  appleWebApp: {
    capable: true,
    title: 'Bayan AI - بيان',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e00ff',
};

const themeScript = `
(function() {
  const key = 'bayan-theme';
  const stored = localStorage.getItem(key);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored === 'dark' || (stored !== 'light' && prefersDark);
  if (isDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
`;

const serviceWorkerScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    if (isHttps || isLocalhost) {
      navigator.serviceWorker.register('/sw.js').catch(function (error) {
        console.error('Service worker registration failed:', error);
      });
    }
  });
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${readex.variable} ${amiri.variable} antialiased bg-background text-foreground`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerScript }} />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
