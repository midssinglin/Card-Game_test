// 牌桌學堂 service worker: works offline after the first visit.
const CACHE='ptx-bfd6381ab5';
const CORE=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','firebase-config.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||/firebaseio|googleapis\.com\/identitytoolkit|securetoken|firebasedatabase/.test(u.host+u.pathname))return;
  const sameOrigin=u.origin===location.origin;
  if(sameOrigin&&(e.request.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/')||u.pathname.endsWith('firebase-config.js'))){
    // pages and the Firebase config: network first so updates show up, cache when offline
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
    return;
  }
  // everything else (icons, fonts, Firebase SDK): cache first
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok||res.type==='opaque'){const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return res;})));
});
