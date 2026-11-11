import { NextRequest, NextResponse } from "next/server";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
import {
  deleteAppointmentGoogleEvent,
  upsertAppointmentGoogleEvent,
} from "@/lib/google/server-sync";
import { createClient } from "@/lib/supabase/server";

type SyncBody = {
  action: "upsert" | "delete";
  appointment_id: string;
  client_name?: string;
  scheduled_at: string;
  duration_minutes?: number;
  google_event_id?: string | null;
  notes?: string;
};

export async function POST(req: NextRequest) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Google Calendar não configurado no servidor." },
      { status: 503 },
    );
  }

  let body: SyncBody;
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  if (!body.appointment_id || !body.scheduled_at || !body.action) {
    return NextResponse.json({ ok: false, error: "Dados incompletos." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase não configurado." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Faça login." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "pai_de_santo") {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 403 });
  }

  if (body.action === "delete") {
    const result = await deleteAppointmentGoogleEvent(supabase, user.id, {
      appointment_id: body.appointment_id,
      google_event_id: body.google_event_id,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({
      ok: true,
      deleted: result.deleted === true,
      skipped: result.skipped === true,
    });
  }

  const result = await upsertAppointmentGoogleEvent(supabase, user.id, {
    appointment_id: body.appointment_id,
    client_name: body.client_name,
    scheduled_at: body.scheduled_at,
    duration_minutes: body.duration_minutes,
    google_event_id: body.google_event_id,
    notes: body.notes,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, google_event_id: result.google_event_id });
}
