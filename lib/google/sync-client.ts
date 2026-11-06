/** Chama a API de sync Google Calendar (App → Google). */

export async function syncAppointmentToGoogle(input: {
  action: "upsert" | "delete";
  appointment_id: string;
  client_name?: string;
  scheduled_at: string;
  duration_minutes?: number;
  google_event_id?: string | null;
  notes?: string;
}): Promise<{ ok: boolean; google_event_id?: string; error?: string; skipped?: boolean }> {
  try {
    const res = await fetch("/api/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      google_event_id?: string;
      error?: string;
      skipped?: boolean;
    };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || "Falha ao sincronizar com Google." };
    }
    return {
      ok: true,
      google_event_id: json.google_event_id,
      skipped: json.skipped,
    };
  } catch {
    return { ok: false, error: "Sem conexão para sincronizar o Google Calendar." };
  }
}
