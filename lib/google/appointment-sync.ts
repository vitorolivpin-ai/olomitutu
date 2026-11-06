import { syncAppointmentToGoogle } from "@/lib/google/sync-client";
import type { Appointment, Client } from "@/types";

/** Após criar agendamento: sobe para o Google e devolve o event id. */
export async function pushAppointmentToGoogle(
  appointment: Appointment,
  client: Client | undefined,
): Promise<string | undefined> {
  const result = await syncAppointmentToGoogle({
    action: "upsert",
    appointment_id: appointment.id,
    client_name: client?.full_name,
    scheduled_at: appointment.scheduled_at,
    duration_minutes: appointment.duration_minutes,
    google_event_id: appointment.google_event_id,
    notes: appointment.notes,
  });
  return result.ok ? result.google_event_id : undefined;
}

/** Após cancelar: remove do Google se houver event id. */
export async function removeAppointmentFromGoogle(appointment: Appointment) {
  if (!appointment.google_event_id) return;
  await syncAppointmentToGoogle({
    action: "delete",
    appointment_id: appointment.id,
    scheduled_at: appointment.scheduled_at,
    google_event_id: appointment.google_event_id,
  });
}
