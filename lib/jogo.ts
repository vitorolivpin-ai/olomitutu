import type {
  Appointment,
  JogoAccessIndexEntry,
  JogoFlowStatus,
  JogoModalidade,
  JogoSlotHold,
  UserRole,
} from "@/types";

/** Valor padrão do Jogo quando houseSettings.jogo_amount não está definido. */
export const DEFAULT_JOGO_AMOUNT = 150;

/** Reserva temporária do horário (minutos). */
export const JOGO_HOLD_MINUTES = 20;

/** Prazo de análise do Pai após comprovante (horas). */
export const JOGO_ANALYSIS_HOURS = 24;

/** Validade do token de acesso após confirmação (dias). */
export const JOGO_ACCESS_TOKEN_DAYS = 14;

/** Tamanho máximo do comprovante (5 MB). */
export const JOGO_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export const JOGO_PROOF_MIME = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

const OCCUPYING_JOGO: JogoFlowStatus[] = [
  "aguardando_pagamento",
  "comprovante_enviado",
  "aguardando_aprovacao",
  "confirmado",
  "prazo_analise_atingido",
];

export function isJogoOccupyingStatus(status?: JogoFlowStatus | null) {
  return Boolean(status && OCCUPYING_JOGO.includes(status));
}

export function createJogoAccessToken() {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function holdExpiresAt(from = new Date()) {
  return new Date(from.getTime() + JOGO_HOLD_MINUTES * 60_000).toISOString();
}

export function analysisDeadlineAt(fromIso: string) {
  const from = new Date(fromIso);
  return new Date(from.getTime() + JOGO_ANALYSIS_HOURS * 3600_000).toISOString();
}

export function analysisReminderAt(deadlineIso: string) {
  const deadline = new Date(deadlineIso);
  return new Date(deadline.getTime() - 2 * 3600_000).toISOString();
}

export function accessTokenExpiresAt(from = new Date()) {
  return new Date(from.getTime() + JOGO_ACCESS_TOKEN_DAYS * 24 * 3600_000).toISOString();
}

export function modalidadeLabel(m?: JogoModalidade | null) {
  if (m === "online") return "Online";
  if (m === "presencial") return "Presencial";
  return "—";
}

export function jogoStatusLabel(status?: JogoFlowStatus | null) {
  switch (status) {
    case "aguardando_pagamento":
      return "Aguardando pagamento";
    case "comprovante_enviado":
      return "Comprovante enviado";
    case "aguardando_aprovacao":
      return "Aguardando aprovação do Pai de Santo";
    case "confirmado":
      return "Confirmado";
    case "recusado":
      return "Recusado";
    case "cancelado":
      return "Cancelado";
    case "prazo_analise_atingido":
      return "Prazo de análise atingido";
    default:
      return "—";
  }
}

/** Somente o Pai de Santo gerencia Jogos / comprovantes. */
export function canManageJogo(role: UserRole | null | undefined) {
  return role === "pai_de_santo";
}

export function canViewJogoComprovante(opts: {
  role: UserRole | null | undefined;
  viewerProfileId?: string | null;
  appointment: Pick<Appointment, "pai_only_ficha" | "access_token" | "access_token_revoked" | "access_token_expires_at" | "client_id">;
  clientResponsibleId?: string | null;
  visitorToken?: string | null;
}) {
  const { role, appointment, clientResponsibleId, viewerProfileId, visitorToken } = opts;
  if (role === "pai_de_santo") {
    if (!clientResponsibleId || !viewerProfileId) return role === "pai_de_santo";
    return clientResponsibleId === viewerProfileId;
  }
  if (role === "administrador" || role === "tesouraria") return false;
  if (visitorToken && appointment.access_token === visitorToken) {
    if (appointment.access_token_revoked) return false;
    if (
      appointment.access_token_expires_at &&
      new Date(appointment.access_token_expires_at).getTime() < Date.now()
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export function pruneJogoSlotHolds(
  holds: JogoSlotHold[] | undefined,
  now = Date.now(),
): JogoSlotHold[] {
  return (holds ?? []).filter((hold) => {
    if (!isJogoOccupyingStatus(hold.jogo_status)) return false;
    if (hold.jogo_status === "aguardando_pagamento") {
      return new Date(hold.expires_at).getTime() > now;
    }
    return true;
  });
}

export function isScheduledAtHeld(
  scheduledAt: string,
  holds: JogoSlotHold[] | undefined,
  exceptAppointmentId?: string,
) {
  const active = pruneJogoSlotHolds(holds);
  return active.some(
    (h) =>
      h.scheduled_at === scheduledAt &&
      h.appointment_id !== exceptAppointmentId &&
      isJogoOccupyingStatus(h.jogo_status),
  );
}

export function upsertJogoSlotHold(
  holds: JogoSlotHold[] | undefined,
  next: JogoSlotHold,
): JogoSlotHold[] {
  const pruned = pruneJogoSlotHolds(holds).filter(
    (h) => h.appointment_id !== next.appointment_id,
  );
  if (!isJogoOccupyingStatus(next.jogo_status)) return pruned;
  return [next, ...pruned];
}

export function upsertJogoAccessIndex(
  index: JogoAccessIndexEntry[] | undefined,
  next: JogoAccessIndexEntry,
): JogoAccessIndexEntry[] {
  const rest = (index ?? []).filter((e) => e.appointment_id !== next.appointment_id);
  return [next, ...rest];
}

export function findJogoAccessByToken(
  index: JogoAccessIndexEntry[] | undefined,
  token: string,
) {
  const entry = (index ?? []).find((e) => e.access_token === token);
  if (!entry || entry.revoked) return null;
  if (new Date(entry.expires_at).getTime() < Date.now()) return null;
  return entry;
}

export function validateJogoProofFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!JOGO_PROOF_MIME.includes(file.type as (typeof JOGO_PROOF_MIME)[number])) {
    return { ok: false, error: "Envie JPG, PNG ou PDF." };
  }
  if (file.size <= 0 || file.size > JOGO_PROOF_MAX_BYTES) {
    return { ok: false, error: "O arquivo deve ter no máximo 5 MB." };
  }
  return { ok: true };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function visitorAccessPath(token: string) {
  return `/marcar/acesso/${encodeURIComponent(token)}`;
}
