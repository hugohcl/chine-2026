const CACHE='voyage-mobile-6d347dc45b22';



const FILES=['./weather-icons/clear-day.svg','./weather-icons/clear-night.svg','./weather-icons/drizzle.svg','./weather-icons/fog.svg','./weather-icons/not-available.svg','./weather-icons/overcast.svg','./weather-icons/partly-cloudy-day.svg','./weather-icons/partly-cloudy-night.svg','./weather-icons/rain.svg','./weather-icons/raindrop.svg','./weather-icons/sleet.svg','./weather-icons/snow.svg','./weather-icons/thunderstorms.svg','./weather-icons/wind.svg','./notifications.js','./','./index.html','./access.css','./access.js','./crypto.js','./mobile-app.css','./mobile-app.js','./session-storage.js','./manifest.webmanifest','./oogway.png','./huahua-sticker.png','./huahua-icon-180.png','./huahua-icon-192.png','./huahua-icon-512.png','./huahua-icon-32.png','./config.js','./vendor/supabase-2.105.0.js','./vendor/leaflet.js','./vendor/leaflet.css'];



const OPTIONAL=[];
FILES.push('./vendor/pdfjs/pdf.min.mjs','./vendor/pdfjs/pdf.worker.min.mjs');



self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting())));

// A page must receive this acknowledgement before claiming its copy is ready.
// This also covers an update that was still installing when preparation began.
self.addEventListener('message',event=>{
 if(event.data?.type!=='PREPARE_OFFLINE_FILES'||!event.ports?.[0])return;
 const port=event.ports[0];
 event.waitUntil(caches.open(CACHE)
  .then(cache=>cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'}))))
  .then(()=>port.postMessage({ok:true,cache:CACHE}),()=>port.postMessage({ok:false})));
});



self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('voyage-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));



self.addEventListener('fetch',e=>{



 const url=new URL(e.request.url);



 if(e.request.method!=='GET'||url.origin!==self.location.origin)return;



 const path=new URL('.',self.location.href).pathname;



 if(!FILES.concat(OPTIONAL).some(f=>new URL(f,self.location.href).pathname===url.pathname))return;



 e.respondWith(caches.open(CACHE).then(async c=>{



  if(e.request.mode==='navigate'){



   try{const r=await fetch(new Request(e.request,{cache:'reload',signal:AbortSignal.timeout(4000)}));if(r.ok){await c.put(e.request,r.clone());return r;}}catch(error){}



   const cached=await c.match(e.request)||await c.match(new URL('./',self.location.href));if(cached)return cached;



   return Response.error();



  }



  const saved=await c.match(e.request);if(saved)return saved;



  const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r;



 }));



});





function reminderURL(value){
 const base=new URL('./',self.location.href),u=new URL(typeof value==='string'?value:'#todo',base);
 return u.origin===base.origin&&u.pathname===base.pathname?u.href:new URL('#todo',base).href;
}
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data={};try{data=event.data.json();}catch{}
 await self.registration.showNotification(typeof data.title==='string'?data.title.slice(0,120):'Réservations du voyage',{
 body:typeof data.body==='string'?data.body.slice(0,400):'Ouvre la To do pour consulter tes rappels.',
 icon:'./huahua-icon-192.png',badge:'./huahua-icon-32.png',
 tag:typeof data.tag==='string'&&/^voyage-[a-zA-Z0-9:-]{1,100}$/.test(data.tag)?data.tag:'voyage-rappel',
 data:{url:reminderURL(data.url)},renotify:true
 });
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
 const url=reminderURL(event.notification.data?.url),base=new URL('./',self.location.href).href;
 const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of all){if(client.url.startsWith(base)){await client.navigate(url);await client.focus();return;}}
 await self.clients.openWindow(url);
})());});
