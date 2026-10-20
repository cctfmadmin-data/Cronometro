// Service worker comum às duas apps (Operador e Ranking)
// Estratégia: rede primeiro (recebe sempre a versão mais recente),
// cache como reserva (a app abre mesmo sem rede).
const CACHE = "crono-v4";
const BASE = [
  "./",
  "./index.html",
  "./operador.html",
  "./config.js",
  "./comum.js",
  "./manifest.webmanifest",
  "./manifest-ranking.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./ranking-192.png",
  "./ranking-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // nunca guardar em cache os pedidos à base de dados (Supabase)
  if (url.hostname.endsWith("supabase.co")) return;
  const local = url.origin === self.location.origin;
  if (!local && url.hostname !== "cdn.jsdelivr.net") return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r => {
          if (r || req.mode !== "navigate") return r;
          return caches.match(url.pathname.includes("operador") ? "./operador.html" : "./index.html");
        })
      )
  );
});
