import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AccessLens',
        short_name: 'AccessLens',
        description: 'An assistive environmental awareness companion',
        theme_color: '#101d2b',
        background_color: '#f7f7f2',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icons/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'accesslens-model', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 180 } }
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'accesslens-map-tiles', expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 7 } }
          }
        ]
      }
    })
  ]
});
