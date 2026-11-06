import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_CALENDAR_SCOPES,
  getGoogleOAuthConfig,
  isGoogleCalendarConfigured,
} from "@/lib/google/config";
import { getAppOrigin } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() || req.nextUrl.origin;

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL("/agenda?gcal=config", origin),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.redirect(new URL("/entrar/pai_de_santo", origin));
  }

  const { data: profile } = await supabase!
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.role !== "pai_de_santo" &&
    profile?.role !== "administrador"
  ) {
    return NextResponse.redirect(new URL("/agenda?gcal=forbidden", origin));
  }

  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const state = Buffer.from(
    JSON.stringify({ uid: user.id, n: Date.now() }),
    "utf8",
  ).toString("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    path: "/",
    maxAge: 600,
  });
  return res;
}
