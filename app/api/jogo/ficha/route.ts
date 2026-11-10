import { NextRequest, NextResponse } from "next/server";
import { hashJogoToken } from "@/lib/jogo/token-hash";
import { requireJogoRemoteAdmin, rpcErrorMessage } from "@/lib/jogo/server";
import { mapRemoteJogoAppointment, type RemoteJogoAppointmentRow } from "@/lib/supabase/jogo";
import type { AppointmentGuestFicha } from "@/types";

export async function POST(req: NextRequest) {
  const gate = requireJogoRemoteAdmin();
  if (!gate.ok) return gate.response;

  let body: {
    appointment_id?: string;
    guest_secret?: string;
    ficha?: AppointmentGuestFicha;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const appointmentId = body.appointment_id?.trim();
  const guestSecret = body.guest_secret?.trim();
  const ficha = body.ficha;
  if (!appointmentId || !guestSecret || !ficha) {
    return NextResponse.json({ ok: false, error: "Dados incompletos." }, { status: 400 });
  }

  const name = ficha.full_name?.trim() ?? "";
  const phone = ficha.phone?.trim() ?? "";
  const email = ficha.email?.trim() ?? "";
  const birth = ficha.birth_date?.trim() ?? "";
  if (name.length < 3) {
    return NextResponse.json({ ok: false, error: "Informe seu nome completo." }, { status: 400 });
  }
  if (phone.length < 8) {
    return NextResponse.json({ ok: false, error: "Informe um WhatsApp válido." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (!birth) {
    return NextResponse.json({ ok: false, error: "Informe a data de nascimento." }, { status: 400 });
  }
  if (!ficha.privacy_accepted) {
    return NextResponse.json(
      { ok: false, error: "Aceite a Política de Privacidade para continuar." },
      { status: 400 },
    );
  }

  const { data, error } = await gate.admin.rpc("jogo_complete_ficha", {
    p_appointment_id: appointmentId,
    p_guest_session_token_hash: hashJogoToken(guestSecret),
    p_full_name: name,
    p_phone: phone,
    p_email: email,
    p_birth_date: birth,
    p_observation: ficha.observation ?? null,
    p_privacy_accepted: true,
  });

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: rpcErrorMessage(error, "Reserva não encontrada ou expirada.") },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    appointment: mapRemoteJogoAppointment(data as RemoteJogoAppointmentRow),
  });
}
