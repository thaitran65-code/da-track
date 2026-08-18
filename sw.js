// ƯU TIÊN MẠNG: luôn lấy bản mới nhất khi có mạng; offline mới dùng cache.
const CACHE = 'datrack-v2';
const ASSETS = ['multitrack_player.html','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {                                   // thử MẠNG trước
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match(e.request))                          // rớt mạng -> dùng cache
  );
});
