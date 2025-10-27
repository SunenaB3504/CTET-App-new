/* Simple service worker for the app scaffold
   - caches app shell files on install
   - serves cached resources when offline
   Note: this is a minimal SW suitable for local/dev use. Review before production.
*/
const CACHE_NAME = 'ctet-app-shell-v1'
const ASSETS_TO_CACHE = [ '/', '/index.html', '/favicon.svg', '/src/styles.css' ]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).then(()=> self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  const req = event.request
  // network-first for navigation (HTML)
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(fetch(req).catch(()=> caches.match('/index.html')))
    return
  }
  // for other requests try cache first then network
  event.respondWith(caches.match(req).then(r=> r || fetch(req).then(res=>{
    // optionally cache GET responses
    if(req.method === 'GET' && res && res.status === 200){
      const clone = res.clone()
      caches.open(CACHE_NAME).then(c=> c.put(req, clone))
    }
    return res
  }).catch(()=> caches.match('/favicon.svg'))))
})
