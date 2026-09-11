import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Activities Lab — local-first PWA. No backend; data lives in IndexedDB on-device.
// The service worker precaches the app shell so it installs to the iOS home screen
// and runs fully offline. Remote exercise images (added in Phase 1) are runtime-cached.
//
// GitHub Pages serves project sites from a /<repo>/ subpath rather than root, so
// asset/manifest URLs need that prefix baked in for that target only — set via
// `vite build --mode gh-pages` (Cloudflare Pages and local dev stay at root).
export default defineConfig(({ mode }) => {
  const BASE = mode === 'gh-pages' ? '/activities-lab/' : '/'

  return {
    base: BASE,
    // Bind all interfaces (IPv4 + IPv6) so localhost/127.0.0.1 and LAN both resolve.
    // allowedHosts lets quick tunnels (cloudflare/localtunnel) reach the dev server
    // instead of hitting Vite's "Blocked request" host check.
    server: { host: true, allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app'] },
    preview: { host: true, port: 4173, allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app'] },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // 'prompt' + an in-app banner: the app checks for updates while open and
        // lets the user apply them with one tap (reliable on iOS, unlike silent auto-update).
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'maskable-icon-512x512.png'],
        manifest: {
          name: 'Activities Lab',
          short_name: 'Activities',
          description:
            'Personal training, nutrition, recovery & self-development — local-first, offline.',
          id: BASE,
          start_url: BASE,
          scope: BASE,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#ECE5D8',
          theme_color: '#ECE5D8',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico,woff,woff2,json}'],
          // The Library dataset chunk can exceed the 2 MiB default; bump the cap.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Push + notification-click handlers, merged into the generated SW.
          importScripts: ['push-sw.js'],
          navigateFallback: `${BASE}index.html`,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Library exercise images hosted on the free-exercise-db repo (Phase 1+).
              urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'exercise-images',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: true },
      }),
    ],
  }
})
