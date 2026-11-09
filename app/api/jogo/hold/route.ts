import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_JOGO_AMOUNT,
  JOGO_HOLD_MINUTES,
} from "@/lib/jogo";
import { createRawJogoAccessToken, hashJogoToken } from "@/lib/jogo/token-hash";
import { requireJogoRemoteAdmin, rpcErrorMessage } from "@/lib/jogo/server";
import { mapRemoteJogoAppointment, type RemoteJogoAppointmentRow } from "@/lib/supabase/jogo";
import type { JogoModalidade } from "@/types";

export async function POST(req: NextRequest) {
  const gate = requireJogoRemoteAdmin();
  if (!gate.ok) return gate.response;

  let body: {
    scheduled_at?: string;
    modalidade?: JogoModalidade;
    amount?: number;
    duration_minutes?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const scheduledAt = body.scheduled_at?.trim();
  const modalidade = body.modalidade;
  if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json({ ok: false, error: "Data/horário inválidos." }, { status: 400 });
  }
  if (modalidade !== "online" && modalidade !== "presencial") {
    return NextResponse.json({ ok: false, error: "Escolha a modalidade do Jogo." }, { status: 400 });
  }

  const guestSecret = createRawJogoAccessToken(32);
  const guestHash = hashJogoToken(guestSecret);
  const amount = Number(body.amount ?? DEFAULT_JOGO_AMOUNT);

  const { data, error } = await gate.admin.rpc("jogo_create_hold", {
    p_scheduled_at: scheduledAt,
    p_modalidade: modalidade,
    p_amount: amount,
    p_duration_minutes: body.duration_minutes ?? 60,
    p_guest_session_token_hash: guestHash,
    p_hold_minutes: JOGO_HOLD_MINUTES,
  });

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: rpcErrorMessage(error, "Não foi possível reservar o horário.") },
      { status: 409 },
    );
  }

  const row = data as RemoteJogoAppointmentRow;
  const appointment = mapRemoteJogoAppointment(row);
  if (!appointment.ficha_code || !appointment.hold_expires_at) {
    return NextResponse.json(
      { ok: false, error: "Resposta incompleta do banco ao criar o hold." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    appointment,
    ficha_code: appointment.ficha_code,
    client_id: appointment.client_id,
    hold_expires_at: appointment.hold_expires_at,
    guest_secret: guestSecret,
  });
}
