/* Service worker — PWA + notificações com logo do app */
const SW_VERSION = "oloroke-notif-v15-jogo-push";

function appOrigin() {
  return self.location.origin;
}

/** URLs absolutas — Android/iOS só mostram a logo assim (como no WhatsApp). */
function brandIcons() {
  const base = appOrigin();
  return {
    icon: `${base}/icon-192.png`,
    badge: `${base}/icon-192.png`,
    image: `${base}/icon-512.png`,
  };
}

/** Clique só abre URL same-origin (evita open-redirect). */
function safeSameOriginUrl(raw) {
  try {
    const resolved = new URL(raw || "/", self.location.origin);
    if (resolved.origin !== self.location.origin) return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || "/";
  } catch {
    return "/";
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SW_VERSION)
      .then((cache) =>
        cache.addAll([
          "/icon-192.png?v=3",
          "/icon-512.png?v=3",
          "/icon-512-maskable.png?v=3",
          "/apple-touch-icon.png?v=3",
          "/brasao-olomi-tutu.png?v=3",
          "/splash.png?v=3",
          "/manifest.webmanifest",
        ]),
      )
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Necessário para o Chrome considerar o app instalável */
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

function showAppNotification(data) {
  const brand = brandIcons();
  const title = data.title || "OLÓMÌ TÚTÙ";
  const url = safeSameOriginUrl(data.url || "/");
  return self.registration.showNotification(title, {
    body: data.body || "Abra o app para ver.",
    icon: data.icon || brand.icon,
    badge: data.badge || brand.badge,
    // Imagem grande na notificação expandida (Android)
    image: data.image || undefined,
    tag: data.tag || "chat",
    renotify: true,
    silent: false,
    data: { url },
    vibrate: [120, 60, 120],
  });
}

self.addEventListener("push", (event) => {
  let data = {
    title: "OLÓMÌ TÚTÙ",
    body: "Nova mensagem no app.",
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

  const brand = brandIcons();
  if (!data.icon) data.icon = brand.icon;
  if (!data.badge) data.badge = brand.badge;
  data.url = safeSameOriginUrl(data.url);

  event.waitUntil(showAppNotification(data));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeSameOriginUrl(event.notification?.data?.url || "/");
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
  const brand = brandIcons();
  event.waitUntil(
    showAppNotification({
      title: msg.title || "OLÓMÌ TÚTÙ",
      body: msg.body || "",
      url: msg.url || "/",
      tag: msg.tag || "chat",
      icon: msg.icon || brand.icon,
      badge: msg.badge || brand.badge,
      image: msg.image,
    }),
  );
});
