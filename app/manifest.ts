import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Restaurant & Bar Ops',
    short_name: 'Bar Ops',
    description: 'Offline-friendly restaurant and bar operations app for tablets and mobile devices.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#08111f',
    theme_color: '#14b8a6',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
    ]
  };
}
