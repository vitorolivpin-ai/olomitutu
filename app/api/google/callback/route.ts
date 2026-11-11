import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, fetchGoogleEmail } from "@/lib/google/calendar";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
import { getAppOrigin } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function parseOAuthState(state: string): { uid?: string; n?: number } | null {
  try {
    const json = Buffer.from(state, "base64url").toString("utf8");
    return JSON.parse(json) as { uid?: string; n?: number };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() || req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get("gcal_oauth_state")?.value;

  if (!isGoogleCalendarConfigured() || !code || !state) {
    return NextResponse.redirect(new URL("/agenda?gcal=error&msg=oauth_incompleto", origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user || !supabase) {
    return NextResponse.redirect(new URL("/entrar/pai_de_santo", origin));
  }

  // Cookie pode sumir no Safari/Chrome mobile; aceita state assinado com uid do Pai
  const parsed = parseOAuthState(state);
  const cookieOk = Boolean(saved && state === saved);
  const stateOk =
    parsed?.uid === user.id &&
    typeof parsed.n === "number" &&
    Date.now() - parsed.n < 15 * 60_000;
  if (!cookieOk && !stateOk) {
    return NextResponse.redirect(
      new URL("/agenda?gcal=error&msg=sessao_oauth_expirada", origin),
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "pai_de_santo") {
    return NextResponse.redirect(new URL("/agenda?gcal=forbidden", origin));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    let refreshToken = tokens.refresh_token ?? null;
    if (!refreshToken) {
      // Reconsent às vezes não devolve refresh se já autorizado — mantém o anterior
      const { data: existing } = await supabase
        .from("google_calendar_connections")
        .select("refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();
      refreshToken = existing?.refresh_token ?? null;
    }
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/agenda?gcal=norefresh", origin));
    }

    const email = tokens.access_token
      ? await fetchGoogleEmail(tokens.access_token)
      : null;
    const expiresAt = new Date(
      Date.now() + (tokens.expires_in ?? 3600) * 1000,
    ).toISOString();

    const { error } = await supabase.from("google_calendar_connections").upsert(
      {
        user_id: user.id,
        refresh_token: refreshToken,
        access_token: tokens.access_token ?? null,
        access_token_expires_at: expiresAt,
        calendar_id: "primary",
        google_email: email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return NextResponse.redirect(
        new URL(`/agenda?gcal=error&msg=${encodeURIComponent(error.message)}`, origin),
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    return NextResponse.redirect(
      new URL(`/agenda?gcal=error&msg=${encodeURIComponent(msg)}`, origin),
    );
  }

  const res = NextResponse.redirect(new URL("/agenda?gcal=ok", origin));
  res.cookies.set("gcal_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
