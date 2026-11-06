/* Service worker — PWA instalável + alertas de conversa */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Necessário para o Chrome considerar o app instalável */
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Nova mensagem",
    body: "Um cliente escreveu no chat.",
    url: "/conversas",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data.body = text;
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Nova mensagem", {
      body: data.body || "Abra Conversas no app.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "chat",
      renotify: true,
      data: { url: data.url || "/conversas" },
      vibrate: [120, 60, 120],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/conversas";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate?.(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "SHOW_NOTIFICATION") return;
  event.waitUntil(
    self.registration.showNotification(msg.title || "Nova mensagem", {
      body: msg.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: msg.tag || "chat",
      renotify: true,
      data: { url: msg.url || "/conversas" },
      vibrate: [120, 60, 120],
    }),
  );
});
