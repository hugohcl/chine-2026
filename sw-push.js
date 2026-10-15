/* Pas de cache du contenu déchiffré : chargement de la page chiffrée à chaque ouverture. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
function urlLocale(value) {
  try {
    const u = new URL(value || "./#todo", self.registration.scope);
    if (u.origin === self.location.origin && u.pathname.startsWith(new URL(self.registration.scope).pathname)) return u.href;
  } catch {}
  return new URL("./#todo", self.registration.scope).href;
}
self.addEventListener("push", event => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch {}
  event.waitUntil(self.registration.showNotification(m.titre || "Chine 2026", {
    body: m.corps || "Ouvrez l’application pour consulter votre To Do.",
    icon: "icon-192.png", badge: "icon-192.png", tag: "chine-rappel",
    data: { url: urlLocale(m.url) }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = urlLocale(event.notification.data && event.notification.data.url);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async liste => {
    for (const c of liste) {
      if (new URL(c.url).origin === self.location.origin && "focus" in c) {
        if ("navigate" in c) await c.navigate(url);
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
