import type {
  Appointment,
  AppointmentGuestFicha,
  JogoAccessIndexEntry,
  JogoFlowStatus,
  JogoModalidade,
  JogoSlotHold,
} from "@/types";

type ApiError = { ok: false; error: string; code?: string };

async function parseJson<T>(res: Response): Promise<T | ApiError> {
  try {
    return (await res.json()) as T | ApiError;
  } catch {
    return { ok: false, error: `Resposta inválida (${res.status}).` };
  }
}

export async function remoteHoldJogo(input: {
  scheduled_at: string;
  modalidade: JogoModalidade;
  amount?: number;
  duration_minutes?: number;
}): Promise<
  | {
      ok: true;
      appointment: Appointment;
      ficha_code: string;
      client_id: string;
      hold_expires_at: string;
      guest_secret: string;
    }
  | ApiError
> {
  const res = await fetch("/api/jogo/hold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function remoteCompleteJogoFicha(input: {
  appointment_id: string;
  guest_secret: string;
  ficha: AppointmentGuestFicha;
}): Promise<{ ok: true; appointment: Appointment } | ApiError> {
  const res = await fetch("/api/jogo/ficha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function remoteUploadJogoComprovante(input: {
  appointment_id: string;
  guest_secret: string;
  file: File;
}): Promise<{ ok: true; appointment: Appointment } | ApiError> {
  const form = new FormData();
  form.set("appointment_id", input.appointment_id);
  form.set("guest_secret", input.guest_secret);
  form.set("file", input.file);
  const res = await fetch("/api/jogo/comprovante", { method: "POST", body: form });
  return parseJson(res);
}

export async function remoteDecidirJogo(input: {
  appointment_id: string;
  decision: "aprovar" | "recusar" | "novo_comprovante" | "cancelar";
  note?: string;
}): Promise<
  | {
      ok: true;
      appointment: Appointment;
      access_token?: string;
      email_event?: Appointment["last_email_event"];
    }
  | ApiError
> {
  const res = await fetch("/api/jogo/decidir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function remoteResolveJogoAccess(
  token: string,
): Promise<{ ok: true; entry: JogoAccessIndexEntry } | ApiError> {
  const res = await fetch(`/api/jogo/acesso?token=${encodeURIComponent(token)}`);
  return parseJson(res);
}

export async function remoteListJogoOcupacao(): Promise<
  { ok: true; holds: JogoSlotHold[] } | ApiError
> {
  const res = await fetch("/api/jogo/ocupacao");
  return parseJson(res);
}

export async function remoteSyncOwnedJogos(): Promise<
  | {
      ok: true;
      appointments: Appointment[];
      clients: import("@/types").Client[];
    }
  | ApiError
> {
  const res = await fetch("/api/jogo/sync");
  return parseJson(res);
}

export async function remoteSignedComprovanteUrl(input: {
  appointment_id: string;
  token?: string;
}): Promise<{ ok: true; url: string; expires_in: number } | ApiError> {
  const qs = new URLSearchParams({ appointment_id: input.appointment_id });
  if (input.token) qs.set("token", input.token);
  const res = await fetch(`/api/jogo/comprovante?${qs.toString()}`);
  return parseJson(res);
}

export type RemoteJogoStatus = JogoFlowStatus;
