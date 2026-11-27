// Minimaler Service Worker: speichert nur die App-Hülle (HTML, Skripte, Schrift, Icons).
// Kursdaten und Supabase laufen immer live übers Netz.
const CACHE='fibchart-v5';
const SHELL=['./','index.html','vendor/lightweight-charts.js','vendor/supabase.js','fonts/inter.woff2','icons/icon-192.png','manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  // Netz zuerst (immer aktuelle Version), bei Offline aus dem Cache
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
});
