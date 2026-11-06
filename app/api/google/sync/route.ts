import { NextRequest, NextResponse } from "next/server";
import {
  deleteGoogleEvent,
  upsertGoogleEvent,
  type GoogleTokens,
} from "@/lib/google/calendar";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();
  const db = admin ?? supabase;
  if (!db) return { error: "Supabase não configurado.", status: 500 };

  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user) return { error: "Faça login.", status: 401 };

  // Prefere a conexão do usuário atual; senão a primeira da casa
  const { data: own } = await db
    .from("google_calendar_connections")
    .select(
      "user_id, refresh_token, access_token, access_token_expires_at, calendar_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  let row = own;
  if (!row) {
    const { data: anyConn } = await db
      .from("google_calendar_connections")
      .select(
        "user_id, refresh_token, access_token, access_token_expires_at, calendar_id",
      )
      .limit(1)
      .maybeSingle();
    row = anyConn;
  }

  if (!row?.refresh_token) {
    return {
      error: "Google Calendar não conectado. O Pai deve conectar em Agenda.",
      status: 400,
    };
  }

  return {
    userId: row.user_id,
    tokens: {
      refresh_token: row.refresh_token,
      access_token: row.access_token,
      access_token_expires_at: row.access_token_expires_at,
      calendar_id: row.calendar_id,
    },
  };
}

async function persistRefreshedToken(
  userId: string,
  accessToken: string,
  expiresAt: string,
) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
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
