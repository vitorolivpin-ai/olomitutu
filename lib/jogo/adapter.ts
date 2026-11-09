/**
 * Interface comum de persistência do fluxo de Jogo (Etapa 3).
 * Implementações:
 * - local/demo: AppStore + sessionStorage (Etapa 2)
 * - remote: API Routes + Supabase (migration 031)
 *
 * O use-app-store escolhe a implementação via isJogoRemoteEnabled().
 * Não misturar dados demo com dados reais.
 */
import type {
  Appointment,
  AppointmentGuestFicha,
  JogoAccessIndexEntry,
  JogoModalidade,
  JogoPaymentProof,
  JogoSlotHold,
} from "@/types";

export type JogoHoldResult =
  | {
      ok: true;
      appointment: Appointment;
      ficha_code: string;
      client_id: string;
      hold_expires_at: string;
      guest_secret?: string;
    }
  | { ok: false; error: string };

export type JogoDecideResult =
  | {
      ok: true;
      appointment: Appointment;
      access_token?: string;
      email_event?: Appointment["last_email_event"];
    }
  | { ok: false; error: string };

export interface JogoPersistenceAdapter {
  readonly mode: "local" | "remote";
  hold(input: {
    scheduled_at: string;
    modalidade: JogoModalidade;
    amount?: number;
  }): Promise<JogoHoldResult>;
  completeFicha(input: {
    appointment_id: string;
    ficha: AppointmentGuestFicha;
    guest_secret?: string;
  }): Promise<{ ok: true; appointment: Appointment } | { ok: false; error: string }>;
  attachProof(input: {
    appointment_id: string;
    proof?: Omit<JogoPaymentProof, "uploaded_at">;
    file?: File;
    guest_secret?: string;
  }): Promise<{ ok: true; appointment: Appointment } | { ok: false; error: string }>;
  decide(input: {
    appointment_id: string;
    decision: "aprovar" | "recusar" | "novo_comprovante";
    note?: string;
  }): Promise<JogoDecideResult>;
  resolveAccess(token: string): Promise<JogoAccessIndexEntry | null>;
  listOcupacao?(): Promise<JogoSlotHold[]>;
}
