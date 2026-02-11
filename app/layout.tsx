import type { Metadata } from 'next';
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable} ${readex.variable} ${amiri.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
