// Cache only the public application shell; authenticated API responses never enter CacheStorage.
const CACHE_NAME = 'han-shell-v3';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['/', '/index.html', '/manifest.webmanifest', '/han-192.png', '/han-512.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('han-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy))); }
      return response;
    }).catch(async () => await caches.match('/index.html') || Response.error()));
    return;
  }
  if (!url.pathname.startsWith('/assets/') && !['/manifest.webmanifest', '/han-192.png', '/han-512.png', '/favicon.svg'].includes(url.pathname)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === 'basic') { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy))); }
    return response;
  })));
});
self.addEventListener('push', event => {
  if (!event.data) return;
  try { const payload = event.data.json(); event.waitUntil(self.registration.showNotification(payload.title || 'HAN', { body: payload.body || 'Open HAN to view your update.', icon: '/han-192.png', badge: '/han-192.png', tag: payload.id || 'han-update', data: { deepLink: payload.deepLink || '/#notifications' } })); } catch { /* Invalid provider payload. */ }
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.deepLink || '/#notifications', self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(target.href); return existing.focus(); }
    return clients.openWindow(target.href);
  }));
});
