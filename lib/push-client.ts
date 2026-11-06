"use client";

const SW_PATH = "/sw.js";

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

/** iPhone/iPad em Safari (aba) — Notification só existe depois de instalar na Tela de Início. */
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    Boolean(window.navigator.standalone)
  );
}

export async function registerChatServiceWorker() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.register(SW_PATH, {
    scope: "/",
    updateViaCache: "none",
  });
  // Força atualizar o SW para pegar a logo nas notificações
  void reg.update();
  return reg;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function brandIconUrls() {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return {
    icon: `${base}/icon-192.png`,
    badge: `${base}/icon-192.png`,
    image: `${base}/icon-512.png`,
  };
}

/** Mostra alerta local (funciona com o app aberto / em 2º plano no Android). */
export async function showLocalChatNotification(input: {
  title: string;
  body: string;
  url: string;
  tag?: string;
}) {
  if (!isPushSupported()) return;
  if (Notification.permission !== "granted") return;
  const brand = brandIconUrls();
  const reg = await navigator.serviceWorker.ready;
  if (reg.active) {
    reg.active.postMessage({
      type: "SHOW_NOTIFICATION",
      title: input.title,
      body: input.body,
      url: input.url,
      tag: input.tag ?? "chat",
      icon: brand.icon,
      badge: brand.badge,
      image: brand.image,
    });
    return;
  }
  await reg.showNotification(input.title, {
    body: input.body,
    icon: brand.icon,
    badge: brand.badge,
    // `image` existe no Chrome; tipagem DOM padrão ainda não inclui
    image: brand.image,
    tag: input.tag ?? "chat",
    data: { url: input.url },
  } as NotificationOptions);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Inscreve no Web Push (precisa de NEXT_PUBLIC_VAPID_PUBLIC_KEY). */
export async function subscribeWebPush(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid) {
    return {
      ok: false,
      error: "Chave VAPID não configurada no servidor (NEXT_PUBLIC_VAPID_PUBLIC_KEY).",
    };
  }
  if (!("PushManager" in window)) {
    return { ok: false, error: "Este navegador não suporta push." };
  }

  const permission = await ensureNotificationPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Permissão de notificação negada." };
  }

  await registerChatServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error || "Falha ao salvar inscrição." };
  }
  return { ok: true };
}
