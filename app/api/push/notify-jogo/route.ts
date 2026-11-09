import { NextRequest, NextResponse } from "next/server";
import { isJogoPushEvent } from "@/lib/jogo/push-events";
import { hashJogoToken } from "@/lib/jogo/token-hash";
import { sendJogoPush, revokeVisitorJogoPush } from "@/lib/server/jogo-push";
import { isWebPushConfigured } from "@/lib/server/web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";

export const runtime = "nodejs";

type Body = {
  event?: string;
  jogo_id?: string;
  /** Só no request de aprovação — nunca persistido. */
  access_token?: string;
  guest_secret?: string;
};

export async function POST(req: NextRequest) {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: "vapid", sent: 0 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!isJogoPushEvent(body.event) || !body.jogo_id?.trim()) {
    return NextResponse.json({ error: "event e jogo_id obrigatórios." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY ausente — não dá para enviar push." },
      { status: 503 },
    );
  }

  const jogoId = body.jogo_id.trim();
  const { data: apt, error } = await admin
    .from("appointments")
    .select(
      "id, responsible_profile_id, jogo_status, guest_session_token_hash, public_access_token_hash, public_access_expires_at, public_access_revoked_at, analysis_deadline_at, analysis_reminder_at, scheduled_at",
    )
    .eq("id", jogoId)
    .maybeSingle();

  if (error || !apt) {
    return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });
  }

  const event = body.event;
  const paiEvents = new Set([
    "JOGO_COMPROVANTE_RECEBIDO",
    "JOGO_PRAZO_PROXIMO",
    "JOGO_PRAZO_ATINGIDO",
    "JOGO_LEMBRETE_1H",
    "JOGO_LEMBRETE_15MIN",
  ]);
  const visitorDecisionEvents = new Set([
    "JOGO_CONFIRMADO",
    "JOGO_RECUSADO",
    "JOGO_NOVO_COMPROVANTE",
  ]);

  let allowed = false;

  const session = createRouteHandlerClient(req);
  let role: string | undefined;
  let userId: string | undefined;
  if (session) {
    const {
      data: { user },
    } = await session.supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const { data: profile } = await session.supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = profile?.role as string | undefined;
      if (role === "administrador" || role === "tesouraria") {
        return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
      }
      if (role === "pai_de_santo" && apt.responsible_profile_id === user.id) {
        allowed = true;
      }
    }
  }

  if (!allowed && body.guest_secret?.trim()) {
    const hash = hashJogoToken(body.guest_secret.trim());
    if (apt.guest_session_token_hash === hash && event === "JOGO_COMPROVANTE_RECEBIDO") {
      allowed = true;
    }
  }

  // Prazos/lembretes podem disparar da página pública com refresh — exige status coerente
  if (
    !allowed &&
    (event === "JOGO_PRAZO_PROXIMO" ||
      event === "JOGO_PRAZO_ATINGIDO" ||
      event === "JOGO_LEMBRETE_1H" ||
      event === "JOGO_LEMBRETE_15MIN")
  ) {
    allowed = true;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  if (visitorDecisionEvents.has(event) && role !== "pai_de_santo") {
    return NextResponse.json({ error: "Somente o Pai pode disparar este evento." }, { status: 403 });
  }

  const accessToken =
    event === "JOGO_CONFIRMADO" ||
    event === "JOGO_LEMBRETE_1H" ||
    event === "JOGO_LEMBRETE_15MIN"
      ? body.access_token?.trim()
      : undefined;

  if (event === "JOGO_CONFIRMADO" && !accessToken) {
    return NextResponse.json(
      { error: "access_token obrigatório para JOGO_CONFIRMADO (só neste request)." },
      { status: 400 },
    );
  }

  if (event === "JOGO_RECUSADO") {
    await revokeVisitorJogoPush(admin, { jogoId });
  }

  const result = await sendJogoPush({
    admin,
    event,
    jogoId,
    accessToken,
    paiUserId: (apt.responsible_profile_id as string | null) ?? null,
  });

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    skipped: "skipped" in result ? result.skipped : undefined,
    by: userId ? "session" : "guest_or_deadline",
  });
}
