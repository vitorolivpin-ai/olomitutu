import { NextRequest, NextResponse } from "next/server";
import {
  deleteGoogleEvent,
  upsertGoogleEvent,
  type GoogleTokens,
} from "@/lib/google/calendar";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
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

async function loadHouseTokens(): Promise<
  | { tokens: GoogleTokens; userId: string }
  | { error: string; status: number }
> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado.", status: 500 };

  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user) return { error: "Faça login.", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "pai_de_santo") {
    return { error: "Acesso não autorizado.", status: 403 };
  }

  const { data: own } = await supabase
    .from("google_calendar_connections")
    .select(
      "user_id, refresh_token, access_token, access_token_expires_at, calendar_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!own?.refresh_token) {
    return {
      error: "Google Calendar não conectado. O Pai deve conectar em Agenda.",
      status: 400,
    };
  }

  return {
    userId: own.user_id,
    tokens: {
      refresh_token: own.refresh_token,
      access_token: own.access_token,
      access_token_expires_at: own.access_token_expires_at,
      calendar_id: own.calendar_id,
    },
  };
}

async function persistRefreshedToken(
  userId: string,
  accessToken: string,
  expiresAt: string,
) {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("google_calendar_connections")
    .update({
      access_token: accessToken,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

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

  const loaded = await loadHouseTokens();
  if ("error" in loaded) {
    return NextResponse.json(
      { ok: false, error: loaded.error },
      { status: loaded.status },
    );
  }

  try {
    if (body.action === "delete") {
      if (!body.google_event_id) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      const result = await deleteGoogleEvent(loaded.tokens, body.google_event_id);
      if (result.refreshed) {
        await persistRefreshedToken(
          loaded.userId,
          result.accessToken,
          result.expiresAt,
        );
      }
      return NextResponse.json({ ok: true, deleted: true });
    }

    const result = await upsertGoogleEvent(loaded.tokens, {
      summary: `Jogo / atendimento — ${body.client_name || "Cliente"}`,
      description: [
        `Agendamento OLÓMÌ TÚTÙ`,
        body.client_name ? `Cliente: ${body.client_name}` : null,
        body.notes ? `Obs: ${body.notes}` : null,
        `ID: ${body.appointment_id}`,
      ]
        .filter(Boolean)
        .join("\n"),
      startIso: body.scheduled_at,
      durationMinutes: body.duration_minutes ?? 60,
      eventId: body.google_event_id,
    });

    if (result.refreshed) {
      await persistRefreshedToken(
        loaded.userId,
        result.accessToken,
        result.expiresAt,
      );
    }

    return NextResponse.json({ ok: true, google_event_id: result.eventId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao sincronizar.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
