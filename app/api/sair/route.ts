import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createRouteHandlerClient, withAuthCookies } from "@/lib/supabase/route";

function requestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

/** Encerra sessão Supabase + cookie demo e volta ao hub. */
export async function POST(req: NextRequest) {
  const origin = requestOrigin(req);
  let res = NextResponse.redirect(new URL("/", origin));

  if (isSupabaseConfigured()) {
    const client = createRouteHandlerClient(req);
    if (client) {
      await client.supabase.auth.signOut();
      res = withAuthCookies(client.cookieResponse(), res);
    }
  }

  res.cookies.set("ile-oloroke-sid", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
