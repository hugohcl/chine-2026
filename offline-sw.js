const CACHE='voyage-access-5fba087e3775';
const FILES=['./','./index.html','./access.css','./access.js','./crypto.js','./config.js','./vendor/supabase-2.105.0.js','./vendor/leaflet.js','./vendor/leaflet.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
 const path=new URL('.',self.location.href).pathname;
 if(!FILES.some(f=>new URL(f,self.location.href).pathname===url.pathname))return;
 e.respondWith(caches.open(CACHE).then(async c=>{
  const saved=await c.match(e.request);if(saved)return saved;
  const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r;
 }));
});
