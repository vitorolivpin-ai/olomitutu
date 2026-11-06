import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente Supabase para Route Handlers.
 * Cookies Auth ficam em `cookieResponse`; use `applyCookies` no redirect final.
 */
export function createRouteHandlerClient(request: NextRequest): {
  supabase: SupabaseClient;
  cookieResponse: () => NextResponse;
  applyCookies: (to: NextResponse) => NextResponse;
} | null {
  if (!isSupabaseConfigured()) return null;

  const { url, anonKey } = getSupabasePublicEnv();
  let cookieResponse = NextResponse.next({ request });
  const jar: CookieToSet[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        jar.length = 0;
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          jar.push({ name, value, options });
        });
        cookieResponse = NextResponse.next({ request });
        jar.forEach(({ name, value, options }) =>
          cookieResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  return {
    supabase,
    cookieResponse: () => cookieResponse,
    applyCookies(to: NextResponse) {
      jar.forEach(({ name, value, options }) => to.cookies.set(name, value, options));
      return to;
    },
  };
}

/** Copia cookies de sessão Auth para um redirect/resposta final (com options). */
export function withAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
  return to;
}
