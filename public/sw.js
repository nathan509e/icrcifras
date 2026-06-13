const CACHE_NAME = 'cifras-v3'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/logo.png',
        '/logob.png',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
      ]).catch(() => {})
    })
  )
})

self.addEventListener('fetch', (event) => {
  // Skip caching for non-http(s) protocols
  if (!event.request.url.startsWith('http')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html')
      }
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    ))
  )
})
