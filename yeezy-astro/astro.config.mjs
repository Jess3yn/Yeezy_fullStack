// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import { AstroPWAIntegration as AstroPWA } from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'YZY',
        short_name: 'YZY',
        description: 'Tienda oficial YZY',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#111111',
        background_color: '#ffffff',
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
});