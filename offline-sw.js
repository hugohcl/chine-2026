const CACHE='voyage-access-b6235b426d39';

const FILES=['./','./index.html','./access.css','./access.js','./crypto.js','./mobile-app.css','./mobile-app.js','./session-storage.js','./manifest.webmanifest','./oogway.png','./huahua-sticker.png','./huahua-icon-180.png','./huahua-icon-192.png','./huahua-icon-512.png','./huahua-icon-32.png','./config.js','./vendor/supabase-2.105.0.js','./vendor/leaflet.js','./vendor/leaflet.css'];

const OPTIONAL=['./vendor/pdfjs/pdf.min.mjs','./vendor/pdfjs/pdf.worker.min.mjs'];

self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting())));

self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

self.addEventListener('fetch',e=>{

 const url=new URL(e.request.url);

 if(e.request.method!=='GET'||url.origin!==self.location.origin)return;

 const path=new URL('.',self.location.href).pathname;

 if(!FILES.concat(OPTIONAL).some(f=>new URL(f,self.location.href).pathname===url.pathname))return;

 e.respondWith(caches.open(CACHE).then(async c=>{

  if(e.request.mode==='navigate'){

   try{const r=await fetch(new Request(e.request,{cache:'reload'}));if(r.ok){await c.put(e.request,r.clone());return r;}}catch(error){}

   const cached=await c.match(e.request)||await c.match(new URL('./',self.location.href));if(cached)return cached;

   return Response.error();

  }

  const saved=await c.match(e.request);if(saved)return saved;

  const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r;

 }));

});

