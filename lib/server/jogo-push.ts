import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildJogoPushPayload,
  type JogoPushEvent,
} from "@/lib/jogo/push-events";
import { isWebPushConfigured, sendWebPush } from "@/lib/server/web-push";

type SubRow = {
  id: string;
  endpoint: string;
  subscription: object;
  user_id?: string | null;
  jogo_id?: string | null;
  visitor_token_hash?: string | null;
  active?: boolean | null;
};

function sameOriginPath(url: string) {
  if (!url.startsWith("/")) return "/";
  if (url.startsWith("//")) return "/";
  return url;
}

async function deliverToSubs(
  admin: SupabaseClient,
  subs: SubRow[],
  payload: { title: string; body: string; url: string; tag: string },
) {
  let sent = 0;
  const safeUrl = sameOriginPath(payload.url);
  for (const row of subs) {
    if (row.active === false) continue;
    const result = await sendWebPush(row.subscription, {
      title: payload.title,
      body: payload.body,
      url: safeUrl,
      tag: payload.tag,
    });
    if (result.ok) {
      sent += 1;
      await admin
        .from("push_subscriptions")
        .update({
          last_success_at: new Date().toISOString(),
          failed_at: null,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } else if (result.gone) {
      await admin
        .from("push_subscriptions")
        .update({
          active: false,
          failed_at: new Date().toISOString(),
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } else {
      await admin
        .from("push_subscriptions")
        .update({
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }
  return sent;
}

export type SendJogoPushInput = {
  admin: SupabaseClient;
  event: JogoPushEvent;
  jogoId: string;
  /** Token bruto só para montar URL de JOGO_CONFIRMADO / lembretes visitante. */
  accessToken?: string;
  paiUserId?: string | null;
};

/**
 * Envia push do Jogo. Sem VAPID: skipped (app e e-mail seguem).
 * Admin / Financeiro nunca entram na lista de destinatários.
 */
export async function sendJogoPush(input: SendJogoPushInput) {
  if (!isWebPushConfigured()) {
    return { ok: true as const, skipped: "vapid" as const, sent: 0 };
  }

  const built = buildJogoPushPayload(input.event, {
    jogoId: input.jogoId,
    accessToken: input.accessToken,
  });

  let sent = 0;

  if (built.audience === "pai" || built.audience === "ambos") {
    if (input.paiUserId) {
      const { data: paiSubs } = await input.admin
        .from("push_subscriptions")
        .select("id, endpoint, subscription, user_id, active")
        .eq("user_id", input.paiUserId)
        .eq("active", true);
      sent += await deliverToSubs(input.admin, (paiSubs ?? []) as SubRow[], {
        ...built,
        url:
          built.audience === "ambos" && !input.accessToken
            ? `/atendimentos/${input.jogoId}`
            : built.audience === "ambos"
              ? `/atendimentos/${input.jogoId}`
              : built.url,
      });
    }
  }

  if (built.audience === "visitante" || built.audience === "ambos") {
    const { data: visitorSubs } = await input.admin
      .from("push_subscriptions")
      .select("id, endpoint, subscription, jogo_id, visitor_token_hash, active")
      .eq("jogo_id", input.jogoId)
      .eq("active", true)
      .not("visitor_token_hash", "is", null);
    const visitorUrl =
      built.audience === "ambos"
        ? input.accessToken
          ? `/marcar/acesso/${encodeURIComponent(input.accessToken)}`
          : "/marcar"
        : built.url;
    sent += await deliverToSubs(input.admin, (visitorSubs ?? []) as SubRow[], {
      ...built,
      url: visitorUrl,
    });
  }

  return { ok: true as const, sent };
}

/** Desativa assinaturas de visitante quando token expira/revoga. */
export async function revokeVisitorJogoPush(
  admin: SupabaseClient,
  input: { jogoId: string; visitorTokenHash?: string },
) {
  let q = admin
    .from("push_subscriptions")
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("jogo_id", input.jogoId)
    .not("visitor_token_hash", "is", null);
  if (input.visitorTokenHash) {
    q = q.eq("visitor_token_hash", input.visitorTokenHash);
  }
  await q;
}
