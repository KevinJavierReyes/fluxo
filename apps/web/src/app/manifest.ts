import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fluxo',
    short_name: 'Fluxo',
    description: 'Finanzas personales',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#00927d',
    theme_color: '#00927d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
