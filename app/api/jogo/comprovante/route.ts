import { NextRequest, NextResponse } from "next/server";
import { hashJogoToken } from "@/lib/jogo/token-hash";
import {
  requireJogoRemoteAdmin,
  rpcErrorMessage,
  validateProofMeta,
} from "@/lib/jogo/server";
import { isJogoRemoteEnabled } from "@/lib/jogo/persistence";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import {
  mapRemoteJogoAppointment,
  type RemoteJogoAppointmentRow,
} from "@/lib/supabase/jogo";

const SIGNED_TTL_SECONDS = 120;

/**
 * GET — URL assinada de curta duração.
 * Autorização: Pai dono OU visitante com token de acesso válido.
 * Admin / Financeiro: sempre negado.
 */
export async function GET(req: NextRequest) {
  if (!isJogoRemoteEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Comprovante remoto indisponível (demo local usa armazenamento privado do atendimento).",
        code: "JOGO_REMOTE_OFF",
        policy: {
          pai_de_santo: "permitido se dono",
          visitante: "permitido com token válido do atendimento",
          administrador: "negado",
          tesouraria: "negado",
        },
      },
      { status: 501 },
    );
  }

  const appointmentId = req.nextUrl.searchParams.get("appointment_id")?.trim();
  const visitorToken = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!appointmentId) {
    return NextResponse.json({ ok: false, error: "appointment_id obrigatório" }, { status: 400 });
  }

  const gate = requireJogoRemoteAdmin();
  if (!gate.ok) return gate.response;

  const { data: apt, error } = await gate.admin
    .from("appointments")
    .select(
      "id, responsible_profile_id, comprovante_path, payment_proof_path, public_access_token_hash, public_access_expires_at, public_access_revoked_at, jogo_status",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !apt) {
    return NextResponse.json({ ok: false, error: "Atendimento não encontrado." }, { status: 404 });
  }

  const path = (apt.comprovante_path ?? apt.payment_proof_path) as string | null;
  if (!path) {
    return NextResponse.json({ ok: false, error: "Comprovante não enviado." }, { status: 404 });
  }

  let allowed = false;

  if (visitorToken) {
    const hash = hashJogoToken(visitorToken);
    const tokenOk =
      apt.public_access_token_hash === hash &&
      !apt.public_access_revoked_at &&
      apt.jogo_status === "confirmado" &&
      (!apt.public_access_expires_at ||
        new Date(apt.public_access_expires_at as string).getTime() > Date.now());
    allowed = Boolean(tokenOk);
  } else {
    const session = createRouteHandlerClient(req);
    if (session) {
      const {
        data: { user },
      } = await session.supabase.auth.getUser();
      if (user) {
        const { data: role } = await session.supabase.rpc("current_role");
        if (role === "pai_de_santo" && apt.responsible_profile_id === user.id) {
          allowed = true;
        }
        // administrador / tesouraria: explicitamente negados
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Acesso negado ao comprovante." }, { status: 403 });
  }

  const { data: signed, error: signError } = await gate.admin.storage
    .from("jogo-comprovantes")
    .createSignedUrl(path, SIGNED_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: signError?.message ?? "Falha ao assinar URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: signed.signedUrl,
    expires_in: SIGNED_TTL_SECONDS,
  });
}

/**
 * POST — upload multipart do comprovante do visitante (bucket privado).
 * Não persiste data_url. Requer guest_secret da sessão de hold.
 */
export async function POST(req: NextRequest) {
  const gate = requireJogoRemoteAdmin();
  if (!gate.ok) return gate.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "FormData inválido." }, { status: 400 });
  }

  const appointmentId = String(form.get("appointment_id") ?? "").trim();
  const guestSecret = String(form.get("guest_secret") ?? "").trim();
  const file = form.get("file");

  if (!appointmentId || !guestSecret || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Dados incompletos." }, { status: 400 });
  }

  const meta = validateProofMeta({ type: file.type, size: file.size });
  if (!meta.ok) {
    return NextResponse.json({ ok: false, error: meta.error }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "comprovante";
  const path = `${appointmentId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upError } = await gate.admin.storage.from("jogo-comprovantes").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (upError) {
    return NextResponse.json(
      { ok: false, error: upError.message || "Falha no upload do comprovante." },
      { status: 500 },
    );
  }

  const { data, error } = await gate.admin.rpc("jogo_attach_comprovante", {
    p_appointment_id: appointmentId,
    p_guest_session_token_hash: hashJogoToken(guestSecret),
    p_path: path,
    p_mime: file.type,
    p_file_name: file.name,
    p_size_bytes: file.size,
  });

  if (error || !data) {
    await gate.admin.storage.from("jogo-comprovantes").remove([path]);
    return NextResponse.json(
      { ok: false, error: rpcErrorMessage(error, "Não foi possível registrar o comprovante.") },
      { status: 400 },
    );
  }

  const remoteRow = data as RemoteJogoAppointmentRow;
  const appointment = mapRemoteJogoAppointment(remoteRow);

  try {
    const { sendJogoPush } = await import("@/lib/server/jogo-push");
    await sendJogoPush({
      admin: gate.admin,
      event: "JOGO_COMPROVANTE_RECEBIDO",
      jogoId: appointment.id,
      paiUserId: remoteRow.responsible_profile_id ?? null,
    });
  } catch {
    /* push opcional */
  }

  return NextResponse.json({
    ok: true,
    appointment,
  });
}
