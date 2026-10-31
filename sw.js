/* Habitopia Aile PWA worker: static shell + user-visible background push. */
const CACHE="habitopia-aile-shell-v3";
const SHELL=["./","./index.html","./assets/family.css","./assets/family-flow.css",
 "./assets/family-mobile-polish.css","./assets/family-push-ui.css",
 "./assets/family-cloud.js","./assets/family-push.js","./assets/family.js",
 "./assets/habitopia-logo-transparent.png","./manifest.webmanifest"];
self.addEventListener("install",e=>{
 e.waitUntil(caches.open(CACHE).then(async c=>{
   await Promise.allSettled(SHELL.map(path=>c.add(new Request(path,{cache:"reload"}))));
   await self.skipWaiting();
 }));
});
self.addEventListener("activate",e=>{
 e.waitUntil(Promise.all([
   caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("habitopia-aile-shell-")&&k!==CACHE).map(k=>caches.delete(k)))),
   self.clients.claim()
 ]));
});
self.addEventListener("fetch",e=>{
 const req=e.request;
 if(req.method!=="GET")return;
 const u=new URL(req.url);
 if(u.origin!==self.location.origin)return;
 const scope=new URL(self.registration.scope);
 if(!u.pathname.startsWith(scope.pathname))return;
 if(req.mode==="navigate"){
   e.respondWith(fetch(req).then(r=>{
     if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy)).catch(()=>{});}
     return r;
   }).catch(async()=>{
     const c=await caches.open(CACHE);
     return await c.match("./index.html")||Response.error();
   }));
 }else if(/\.(?:js|css|svg|png|webp|webmanifest)$/i.test(u.pathname)){
   e.respondWith(fetch(req).then(r=>{
     if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
     return r;
   }).catch(async()=>await caches.match(req)||Response.error()));
 }
});
self.addEventListener("push",event=>{
 const link=new URL("./index.html?open=notifications",self.registration.scope).href;
 // Intentionally no private family or health information in lock-screen text.
 event.waitUntil(self.registration.showNotification("Habitopia Aile",{
   body:"Ailenden yeni bir görev veya önemli bir hatırlatma var. Görmek için dokun.",
   icon:new URL("./assets/habitopia-logo-transparent.png",self.registration.scope).href,
   badge:new URL("./family-icon.svg",self.registration.scope).href,
   tag:"habitopia-family-"+Date.now(),
   renotify:false,
   data:{url:link},
   vibrate:[100,60,100]
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const link=event.notification.data?.url||new URL("./index.html?open=notifications",self.registration.scope).href;
 event.waitUntil((async()=>{
   const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
   const expected=new URL(self.registration.scope);
   for(const client of windows){
     if(new URL(client.url).origin===expected.origin&&new URL(client.url).pathname.startsWith(expected.pathname)){
       await client.focus();
       client.postMessage({type:"HABITOPIA_OPEN_NOTIFICATIONS"});
       return;
     }
   }
   await self.clients.openWindow(link);
 })());
});
