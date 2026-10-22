/* Service Worker — 简单离线缓存
 * 策略：index.html network-first（保证主文件永远最新），其他资源 cache-first
 */
const CACHE_NAME = 'teleprompter-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first：主入口永远优先网络，失败再回退缓存
    e.respondWith(
      fetch(e.request).then((resp) => {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
    );
  } else {
    // Cache-first：静态资源用缓存
    e.respondWith(
      caches.match(e.request).then((hit) =>
        hit || fetch(e.request).then((resp) => {
          if (resp.ok && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return resp;
        }).catch(() => hit)
      )
    );
  }
});
