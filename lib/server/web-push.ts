import type { PushSubscription } from "web-push";

export function isWebPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

export async function sendWebPush(
  subscription: PushSubscription | object,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  if (!isWebPushConfigured()) {
    return { ok: false as const, error: "VAPID não configurado" };
  }

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || "mailto:contato@olomitutu.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
      process.env.VAPID_PRIVATE_KEY!.trim(),
    );
    await webpush.sendNotification(subscription as PushSubscription, JSON.stringify(payload));
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha no push";
    return { ok: false as const, error: message };
  }
}
