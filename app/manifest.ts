import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bayan AI - بيان',
    short_name: 'Bayan AI',
    description: 'Bayan AI helps you analyze and improve Quran recitation.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1e00ff',
    icons: [
      {
        src: '/black.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/black.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

