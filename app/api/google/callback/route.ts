import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, fetchGoogleEmail } from "@/lib/google/calendar";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
import { getAppOrigin } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() || req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get("gcal_oauth_state")?.value;

  if (!isGoogleCalendarConfigured() || !code || !state || state !== saved) {
    return NextResponse.redirect(new URL("/agenda?gcal=error", origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user || !supabase) {
    return NextResponse.redirect(new URL("/entrar/pai_de_santo", origin));
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
