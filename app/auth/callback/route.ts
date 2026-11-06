import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient, withAuthCookies } from "@/lib/supabase/route";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function requestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

/**
 * Troca o código do e-mail (confirmação / reset) por sessão.
 * Ex.: redirectTo = /auth/callback?next=/nova-senha
 */
export async function GET(req: NextRequest) {
  const origin = requestOrigin(req);
  const code = req.nextUrl.searchParams.get("code");
  const nextRaw = req.nextUrl.searchParams.get("next") || "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const client = createRouteHandlerClient(req);
  if (!client) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const { error } = await client.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const url = new URL("/recuperar-senha", origin);
    url.searchParams.set("erro", "Link inválido ou expirado. Solicite outro.");
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await client.supabase.auth.getUser();

  const res = withAuthCookies(
    client.cookieResponse(),
    NextResponse.redirect(new URL(next, origin)),
  );

  if (user) {
    res.cookies.set("ile-oloroke-sid", user.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return res;
}
