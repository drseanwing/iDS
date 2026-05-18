export const serviceWorkerNavigationDenylist = [
  /^\/auth(?:\/|$)/,
  /^\/api(?:\/|$)/,
  /^\/health$/,
];

export const pwaWorkboxOptions = {
  navigateFallbackDenylist: serviceWorkerNavigationDenylist,
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
  runtimeCaching: [
    {
      // API calls: NetworkFirst, fall back to cache
      urlPattern: /^\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Static assets (fonts, images): CacheFirst, 30-day TTL
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // App shell (HTML, JS, CSS): NetworkFirst with CacheFirst fallback
      urlPattern: /\.(?:js|css|html)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-shell-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
};
