import { NextRequest, NextResponse } from "next/server";
import { JOGO_ACCESS_TOKEN_DAYS } from "@/lib/jogo";
import { createRawJogoAccessToken, hashJogoToken } from "@/lib/jogo/token-hash";
import { isJogoRemoteEnabled } from "@/lib/jogo/persistence";
import { rpcErrorMessage } from "@/lib/jogo/server";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { mapRemoteJogoAppointment, type RemoteJogoAppointmentRow } from "@/lib/supabase/jogo";

export async function POST(req: NextRequest) {
  if (!isJogoRemoteEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Persistência remota de Jogo desativada.",
        code: "JOGO_REMOTE_OFF",
      },
      { status: 503 },
    );
  }

  const client = createRouteHandlerClient(req);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Supabase não configurado." }, { status: 503 });
  }

  const {
    data: { user },
  } = await client.supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Autenticação necessária." }, { status: 401 });
  }

  let body: {
    appointment_id?: string;
    decision?: "aprovar" | "recusar" | "novo_comprovante" | "cancelar";
    note?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const appointmentId = body.appointment_id?.trim();
  const decision = body.decision;
  if (!appointmentId || !decision) {
    return NextResponse.json({ ok: false, error: "Dados incompletos." }, { status: 400 });
  }

  let accessToken: string | undefined;
  let tokenHash: string | null = null;
  if (decision === "aprovar") {
    accessToken = createRawJogoAccessToken(32);
    tokenHash = hashJogoToken(accessToken);
  }

  const { data, error } = await client.supabase.rpc("jogo_pai_decidir", {
    p_appointment_id: appointmentId,
    p_decision: decision,
    p_note: body.note ?? null,
    p_public_access_token_hash: tokenHash,
    p_access_days: JOGO_ACCESS_TOKEN_DAYS,
  });

  if (error || !data) {
    const status = /not authorized/i.test(error?.message ?? "") ? 403 : 400;
    return client.applyCookies(
      NextResponse.json(
        { ok: false, error: rpcErrorMessage(error, "Não foi possível aplicar a decisão.") },
        { status },
      ),
    );
  }

  const remoteRow = data as RemoteJogoAppointmentRow;
  const appointment = mapRemoteJogoAppointment(remoteRow);
  if (accessToken) {
    appointment.access_token = accessToken;
  }

  const emailEvent =
    decision === "aprovar"
      ? ("confirmado" as const)
      : decision === "recusar"
        ? ("recusado" as const)
        : decision === "novo_comprovante"
          ? ("novo_comprovante" as const)
          : undefined;

  try {
    const { data: clientRow } = await client.supabase
      .from("clients")
      .select("full_name")
      .eq("id", appointment.client_id)
      .maybeSingle();
    const { syncJogoDecisionToGoogle } = await import("@/lib/google/server-sync");
    const googleEventId = await syncJogoDecisionToGoogle({
      supabase: client.supabase,
      userId: user.id,
      decision,
      appointment: {
        appointment_id: appointment.id,
        client_name: clientRow?.full_name ?? null,
        guest_name: appointment.guest_ficha?.full_name ?? null,
        scheduled_at: appointment.scheduled_at,
        duration_minutes: appointment.duration_minutes,
        google_event_id: appointment.google_event_id ?? remoteRow.google_event_id,
        notes: appointment.notes,
      },
    });
    if (googleEventId !== undefined) {
      appointment.google_event_id = googleEventId ?? undefined;
    }
  } catch {
    /* Google opcional */
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { sendJogoPush, revokeVisitorJogoPush } = await import("@/lib/server/jogo-push");
    const admin = createAdminClient();
    if (admin) {
      const pushEvent =
        decision === "aprovar"
          ? ("JOGO_CONFIRMADO" as const)
          : decision === "recusar"
            ? ("JOGO_RECUSADO" as const)
            : decision === "novo_comprovante"
              ? ("JOGO_NOVO_COMPROVANTE" as const)
              : null;
      if (pushEvent === "JOGO_RECUSADO") {
        await revokeVisitorJogoPush(admin, { jogoId: appointment.id });
      }
      if (pushEvent) {
        await sendJogoPush({
          admin,
          event: pushEvent,
          jogoId: appointment.id,
          accessToken: pushEvent === "JOGO_CONFIRMADO" ? accessToken : undefined,
          paiUserId: remoteRow.responsible_profile_id ?? null,
        });
      }
    }
  } catch {
    /* push opcional */
  }

  return client.applyCookies(
    NextResponse.json({
      ok: true,
      appointment,
      access_token: accessToken,
      email_event: emailEvent,
    }),
  );
}
