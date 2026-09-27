/* Service worker du site publié : il ne sert qu'aux notifications de rappel.
   Rien n'est mis en cache, la page reste chiffrée et toujours à jour. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch (e) { m = { corps: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(m.titre || "Chine 2026", {
    body: m.corps || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "chine-rappel",
    data: { url: m.url || "./" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(liste => {
    for (const c of liste) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
