import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, fetchGoogleEmail } from "@/lib/google/calendar";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
import { verifyGoogleOAuthState } from "@/lib/google/oauth-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppOrigin } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() || req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get("gcal_oauth_state")?.value;

  if (!isGoogleCalendarConfigured() || !code || !state) {
    return NextResponse.redirect(
      new URL("/agenda?gcal=error&msg=oauth_incompleto", origin),
    );
  }

  const verified = verifyGoogleOAuthState(state);
  const cookieOk = Boolean(saved && state === saved);

  const supabaseUser = await createClient();
  const {
    data: { user },
  } = (await supabaseUser?.auth.getUser()) ?? { data: { user: null } };

  // State assinado basta (celular perde cookie Auth). Cookie legado só vale com sessão.
  let userId: string | null = null;
  if (verified) {
    if (user && user.id !== verified.uid) {
      return NextResponse.redirect(
        new URL("/agenda?gcal=error&msg=sessao_oauth_expirada", origin),
      );
    }
    userId = verified.uid;
  } else if (cookieOk && user) {
    userId = user.id;
  } else {
    return NextResponse.redirect(
      new URL(
        `/agenda?gcal=error&msg=${user ? "sessao_oauth_expirada" : "sessao_perdida_mobile"}`,
        origin,
      ),
    );
  }

  // Com sessão: usa o client do user. Sem sessão (mobile): service role.
  const db = user && supabaseUser ? supabaseUser : createAdminClient();
  if (!db) {
    return NextResponse.redirect(
      new URL("/agenda?gcal=error&msg=sessao_perdida_mobile", origin),
    );
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "pai_de_santo") {
    return NextResponse.redirect(new URL("/agenda?gcal=forbidden", origin));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    let refreshToken = tokens.refresh_token ?? null;
    if (!refreshToken) {
      const { data: existing } = await db
        .from("google_calendar_connections")
        .select("refresh_token")
        .eq("user_id", userId)
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

    const { error } = await db.from("google_calendar_connections").upsert(
      {
        user_id: userId,
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
