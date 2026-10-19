const CACHE='voyage-access-v2';
const FILES=['./','./index.html','./access.css','./access.js','./crypto.js','./config.js','./vendor/supabase-2.105.0.js','./vendor/leaflet.js','./vendor/leaflet.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
 const path=new URL('.',self.location.href).pathname;
 if(!FILES.some(f=>new URL(f,self.location.href).pathname===url.pathname))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request)));
});
