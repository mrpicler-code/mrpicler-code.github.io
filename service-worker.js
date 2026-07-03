const CACHE_NAME = 'vitalpulse-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// Instalace — uloží základní soubory do cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('Cache addAll partial failure (ok):', err);
      });
    })
  );
  self.skipWaiting();
});

// Aktivace — smaže staré cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache jako záloha
// Supabase API volání nikdy necachujeme (vždy potřebujeme aktuální data)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase API — vždy network, nikdy cache
  if(url.hostname.includes('supabase.co') || url.hostname.includes('anthropic.com')){
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Úspěšná síťová odpověď — aktualizuj cache
        if(response && response.status === 200 && response.type !== 'opaque'){
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Offline — zkus cache
        return caches.match(event.request);
      })
  );
});
