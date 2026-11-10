import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Appointment,
  AppointmentGuestFicha,
  Client,
  JogoAccessIndexEntry,
  JogoFlowStatus,
  JogoModalidade,
  JogoPaymentProof,
  JogoSlotHold,
} from "@/types";

/** Linha remota de appointments com colunas da migration 031. */
export type RemoteJogoAppointmentRow = {
  id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: Appointment["status"];
  amount?: number | null;
  notes?: string | null;
  modalidade?: JogoModalidade | null;
  jogo_status?: JogoFlowStatus | null;
  payment_status?: string | null;
  ficha_code?: string | null;
  guest_ficha?: AppointmentGuestFicha | null;
  pai_only_ficha?: boolean | null;
  hold_expires_at?: string | null;
  comprovante_path?: string | null;
  comprovante_mime_type?: string | null;
  comprovante_file_name?: string | null;
  comprovante_size_bytes?: number | null;
  comprovante_uploaded_at?: string | null;
  payment_proof_path?: string | null;
  payment_proof_mime?: string | null;
  payment_proof_name?: string | null;
  payment_proof_size?: number | null;
  proof_uploaded_at?: string | null;
  analysis_deadline_at?: string | null;
  analysis_reminder_at?: string | null;
  analysis_deadline_reached?: boolean | null;
  public_access_token_hash?: string | null;
  public_access_expires_at?: string | null;
  public_access_revoked_at?: string | null;
  chat_enabled_at?: string | null;
  chat_unlocked?: boolean | null;
  enter_jogo_enabled?: boolean | null;
  requested_new_proof?: boolean | null;
  refusal_note?: string | null;
  responsible_profile_id?: string | null;
  confirmed_at?: string | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
  last_email_event?: Appointment["last_email_event"] | null;
  created_at: string;
  updated_at: string;
};

export type RemoteJogoClientRow = {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  birth_date?: string | null;
  notes?: string | null;
  is_guest?: boolean | null;
  registration_complete?: boolean | null;
  responsible_profile_id?: string | null;
  created_at: string;
  updated_at: string;
};

function clean<T extends object>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null) out[k] = v;
  }
  return out as T;
}

export function mapRemoteProof(row: RemoteJogoAppointmentRow): JogoPaymentProof | undefined {
  const path = row.comprovante_path ?? row.payment_proof_path;
  if (!path) return undefined;
  return {
    file_name: row.comprovante_file_name ?? row.payment_proof_name ?? "comprovante",
    mime_type: row.comprovante_mime_type ?? row.payment_proof_mime ?? "application/octet-stream",
    size_bytes: Number(row.comprovante_size_bytes ?? row.payment_proof_size ?? 0),
    uploaded_at:
      row.comprovante_uploaded_at ??
      row.proof_uploaded_at ??
      row.updated_at,
    storage_path: path,
    // data_url propositalmente ausente no remoto
  };
}

/** Mapeia linha remota → Appointment do app (sem token bruto). */
export function mapRemoteJogoAppointment(row: RemoteJogoAppointmentRow): Appointment {
  const proof = mapRemoteProof(row);
  return {
    id: row.id,
    client_id: row.client_id,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes,
    status: row.status,
    amount: row.amount != null ? Number(row.amount) : undefined,
    notes: row.notes ?? undefined,
    modalidade: row.modalidade ?? undefined,
    jogo_status: row.jogo_status ?? undefined,
    ficha_code: row.ficha_code ?? undefined,
    guest_ficha: row.guest_ficha ?? undefined,
    pai_only_ficha: row.pai_only_ficha ?? true,
    hold_expires_at: row.hold_expires_at ?? undefined,
    payment_proof: proof,
    proof_uploaded_at:
      row.comprovante_uploaded_at ?? row.proof_uploaded_at ?? undefined,
    analysis_deadline_at: row.analysis_deadline_at ?? undefined,
    analysis_reminder_at: row.analysis_reminder_at ?? undefined,
    analysis_deadline_reached: row.analysis_deadline_reached ?? false,
    // token bruto não vem do banco; apenas metadados
    access_token_expires_at: row.public_access_expires_at ?? undefined,
    access_token_revoked: Boolean(row.public_access_revoked_at),
    chat_unlocked: Boolean(row.chat_unlocked ?? row.chat_enabled_at),
    enter_jogo_enabled: Boolean(row.enter_jogo_enabled),
    requested_new_proof: Boolean(row.requested_new_proof),
    refusal_note: row.refusal_note ?? undefined,
    last_email_event: row.last_email_event ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapRemoteJogoClient(row: RemoteJogoClientRow): Client {
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email ?? undefined,
    birth_date: row.birth_date ?? undefined,
    notes: row.notes ?? undefined,
    is_guest: Boolean(row.is_guest),
    registration_complete: Boolean(row.registration_complete),
    responsible_profile_id: row.responsible_profile_id ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapOcupacaoToHold(row: {
  appointment_id: string;
  scheduled_at: string;
  expires_at: string | null;
  jogo_status: JogoFlowStatus;
  modalidade: JogoModalidade | null;
}): JogoSlotHold {
  return {
    appointment_id: row.appointment_id,
    scheduled_at: row.scheduled_at,
    expires_at: row.expires_at ?? row.scheduled_at,
    jogo_status: row.jogo_status,
    modalidade: row.modalidade ?? undefined,
  };
}

export function mapResolveAccessToIndex(row: {
  appointment_id: string;
  expires_at: string | null;
  revoked: boolean;
  jogo_status: JogoFlowStatus;
  scheduled_at: string;
  modalidade: JogoModalidade | null;
  chat_unlocked: boolean;
  ficha_code: string | null;
  amount: number | null;
  /** Token bruto só na sessão do visitante — índice remoto usa placeholder. */
  access_token: string;
}): JogoAccessIndexEntry {
  return {
    appointment_id: row.appointment_id,
    access_token: row.access_token,
    expires_at: row.expires_at ?? new Date(0).toISOString(),
    revoked: row.revoked,
    jogo_status: row.jogo_status,
    scheduled_at: row.scheduled_at,
    modalidade: row.modalidade ?? "online",
    chat_unlocked: row.chat_unlocked,
    ficha_code: row.ficha_code ?? "",
    amount: row.amount != null ? Number(row.amount) : undefined,
  };
}

export async function fetchOwnedJogos(
  supabase: SupabaseClient,
): Promise<{ appointments: Appointment[]; clients: Client[]; missing: boolean }> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, clients(*)")
    .not("jogo_status", "is", null)
    .order("scheduled_at", { ascending: false });

  if (error) {
    const m = (error.message ?? "").toLowerCase();
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      m.includes("does not exist") ||
      m.includes("schema cache");
    return { appointments: [], clients: [], missing };
  }

  const appointments: Appointment[] = [];
  const clients: Client[] = [];
  const seen = new Set<string>();

  for (const raw of data ?? []) {
    const row = raw as RemoteJogoAppointmentRow & { clients?: RemoteJogoClientRow | null };
    appointments.push(mapRemoteJogoAppointment(row));
    if (row.clients && !seen.has(row.clients.id)) {
      seen.add(row.clients.id);
      clients.push(mapRemoteJogoClient(clean(row.clients as unknown as Record<string, unknown>)));
    }
  }

  return { appointments, clients, missing: false };
}

export async function fetchJogoOcupacao(
  supabase: SupabaseClient,
): Promise<{ holds: JogoSlotHold[]; missing: boolean }> {
  const { data, error } = await supabase.rpc("jogo_list_ocupacao");
  if (error) {
    const m = (error.message ?? "").toLowerCase();
    const missing =
      error.code === "PGRST202" ||
      m.includes("could not find the function") ||
      m.includes("does not exist");
    return { holds: [], missing };
  }
  const holds = ((data ?? []) as Array<{
    appointment_id: string;
    scheduled_at: string;
    expires_at: string | null;
    jogo_status: JogoFlowStatus;
    modalidade: JogoModalidade | null;
  }>).map(mapOcupacaoToHold);
  return { holds, missing: false };
}
