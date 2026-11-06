import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Cliente Supabase para Route Handlers.
 * Cookies Auth ficam em `cookieResponse`; copie-os para o redirect final.
 */
export function createRouteHandlerClient(request: NextRequest): {
  supabase: SupabaseClient;
  cookieResponse: () => NextResponse;
} | null {
  if (!isSupabaseConfigured()) return null;

  const { url, anonKey } = getSupabasePublicEnv();
  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookieResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  return {
    supabase,
    cookieResponse: () => cookieResponse,
  };
}

/** Copia cookies de sessão Auth para um redirect/resposta final. */
export function withAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
  return to;
}
