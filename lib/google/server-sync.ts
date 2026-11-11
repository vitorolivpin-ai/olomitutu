import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deleteGoogleEvent,
  upsertGoogleEvent,
  type GoogleTokens,
} from "@/lib/google/calendar";
import { isGoogleCalendarConfigured } from "@/lib/google/config";

export type GoogleSyncAppointmentInput = {
  appointment_id: string;
  client_name?: string | null;
  scheduled_at: string;
  duration_minutes?: number | null;
  google_event_id?: string | null;
  notes?: string | null;
};

export type GoogleSyncLoadResult =
  | { ok: true; tokens: GoogleTokens; userId: string }
  | { ok: false; error: string; status: number; skipped?: boolean };

export async function loadGoogleTokensForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoogleSyncLoadResult> {
  if (!isGoogleCalendarConfigured()) {
    return {
      ok: false,
      error: "Google Calendar não configurado no servidor.",
      status: 503,
      skipped: true,
    };
  }

  const { data: own } = await supabase
    .from("google_calendar_connections")
    .select(
      "user_id, refresh_token, access_token, access_token_expires_at, calendar_id",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!own?.refresh_token) {
    return {
      ok: false,
      error: "Google Calendar não conectado. O Pai deve conectar em Agenda.",
      status: 400,
      skipped: true,
    };
  }

  return {
    ok: true,
    userId: own.user_id as string,
    tokens: {
      refresh_token: own.refresh_token,
      access_token: own.access_token,
      access_token_expires_at: own.access_token_expires_at,
      calendar_id: own.calendar_id,
    },
  };
}

export async function persistGoogleAccessToken(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  expiresAt: string,
) {
  await supabase
    .from("google_calendar_connections")
    .update({
      access_token: accessToken,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

async function persistAppointmentGoogleEventId(
  supabase: SupabaseClient,
  appointmentId: string,
  googleEventId: string | null,
) {
  await supabase
    .from("appointments")
    .update({
      google_event_id: googleEventId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);
}

function eventDescription(input: GoogleSyncAppointmentInput) {
  return [
    "Agendamento OLÓMÌ TÚTÙ",
    input.client_name ? `Cliente: ${input.client_name}` : null,
    input.notes ? `Obs: ${input.notes}` : null,
    `ID: ${input.appointment_id}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function upsertAppointmentGoogleEvent(
  supabase: SupabaseClient,
  userId: string,
  input: GoogleSyncAppointmentInput,
): Promise<
  | { ok: true; google_event_id: string }
  | { ok: false; error: string; status: number; skipped?: boolean }
> {
  const loaded = await loadGoogleTokensForUser(supabase, userId);
  if (!loaded.ok) return loaded;

  try {
    const result = await upsertGoogleEvent(loaded.tokens, {
      summary: `Jogo / atendimento — ${input.client_name || "Cliente"}`,
      description: eventDescription(input),
      startIso: input.scheduled_at,
      durationMinutes: input.duration_minutes ?? 60,
      eventId: input.google_event_id,
    });

    if (result.refreshed) {
      await persistGoogleAccessToken(
        supabase,
        loaded.userId,
        result.accessToken,
        result.expiresAt,
      );
    }

    await persistAppointmentGoogleEventId(
      supabase,
      input.appointment_id,
      result.eventId,
    );

    return { ok: true, google_event_id: result.eventId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao sincronizar.";
    return { ok: false, error: message, status: 500 };
  }
}

export async function deleteAppointmentGoogleEvent(
  supabase: SupabaseClient,
  userId: string,
  input: Pick<GoogleSyncAppointmentInput, "appointment_id" | "google_event_id">,
): Promise<
  | { ok: true; deleted?: boolean; skipped?: boolean }
  | { ok: false; error: string; status: number; skipped?: boolean }
> {
  if (!input.google_event_id) {
    return { ok: true, skipped: true };
  }

  const loaded = await loadGoogleTokensForUser(supabase, userId);
  if (!loaded.ok) return loaded;

  try {
    const result = await deleteGoogleEvent(loaded.tokens, input.google_event_id);
    if (result.refreshed) {
      await persistGoogleAccessToken(
        supabase,
        loaded.userId,
        result.accessToken,
        result.expiresAt,
      );
    }
    await persistAppointmentGoogleEventId(supabase, input.appointment_id, null);
    return { ok: true, deleted: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao sincronizar.";
    return { ok: false, error: message, status: 500 };
  }
}

/** Best-effort sync used by Jogo decide — never throws. */
export async function syncJogoDecisionToGoogle(opts: {
  supabase: SupabaseClient;
  userId: string;
  decision: "aprovar" | "recusar" | "cancelar" | "novo_comprovante";
  appointment: GoogleSyncAppointmentInput & {
    guest_name?: string | null;
  };
}): Promise<string | null | undefined> {
  const { supabase, userId, decision, appointment } = opts;
  if (decision === "novo_comprovante") return appointment.google_event_id ?? undefined;

  const clientName = appointment.client_name || appointment.guest_name || null;

  try {
    if (decision === "aprovar") {
      const result = await upsertAppointmentGoogleEvent(supabase, userId, {
        ...appointment,
        client_name: clientName,
      });
      return result.ok ? result.google_event_id : appointment.google_event_id ?? undefined;
    }

    if (decision === "recusar" || decision === "cancelar") {
      await deleteAppointmentGoogleEvent(supabase, userId, {
        appointment_id: appointment.appointment_id,
        google_event_id: appointment.google_event_id,
      });
      return null;
    }
  } catch {
    /* Google opcional */
  }

  return appointment.google_event_id ?? undefined;
}
