import type { PushSubscription } from "web-push";

export function isWebPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

function siteOrigin() {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "";
}

/** Ícones absolutos da logo — necessários para a notificação mostrar a marca. */
export function pushBrandIcons() {
  const base = siteOrigin();
  if (!base) {
    return {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      image: "/icon-512.png",
    };
  }
  return {
    icon: `${base}/icon-192.png`,
    badge: `${base}/icon-192.png`,
    image: `${base}/icon-512.png`,
  };
}

export async function sendWebPush(
  subscription: PushSubscription | object,
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    icon?: string;
    badge?: string;
    image?: string;
  },
) {
  if (!isWebPushConfigured()) {
    return { ok: false as const, error: "VAPID não configurado" };
  }

  const brand = pushBrandIcons();
  const full = {
    ...payload,
    icon: payload.icon || brand.icon,
    badge: payload.badge || brand.badge,
    image: payload.image || brand.image,
  };

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || "mailto:contato@olomitutu.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
      process.env.VAPID_PRIVATE_KEY!.trim(),
    );
    await webpush.sendNotification(subscription as PushSubscription, JSON.stringify(full));
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha no push";
    return { ok: false as const, error: message };
  }
}
