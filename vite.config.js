import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'icons/favicon.svg',
        'icons/apple-touch-icon.png',
        'icons/favicon-32.png',
      ],
      manifest: {
        name: 'Tidebønn',
        short_name: 'Tidebønn',
        description: 'Faste bønner gjennom dagen',
        lang: 'no',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F0E9',
        theme_color: '#F4F0E9',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache statiske app-shell-filer (JS/CSS/HTML/bilder)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Naviger fall-back til index.html for SPA
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/overforing/],
        // Cache Supabase REST + functions for offline-tilgang til bønner
        runtimeCaching: [
          {
            // Bønner, serier, content-pages — read-only cache
            urlPattern: ({ url }) =>
              url.origin.includes('supabase.co') &&
              /\/rest\/v1\/(prayers|prayer_series|content_pages)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tidebonn-data',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts (CSS)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            // Google Fonts (files)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
