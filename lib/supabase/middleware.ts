import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

/** Evita 504 MIDDLEWARE_INVOCATION_TIMEOUT quando Auth/Supabase está lento ou pausado. */
const AUTH_FETCH_TIMEOUT_MS = 4_000;

/** Atualiza cookies de sessão Supabase no request/response do middleware. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS),
        }),
    },
  });

  try {
    // getUser valida JWT no Auth server (necessário para refresh)
    await supabase.auth.getUser();
  } catch {
    // Timeout/rede: segue sem renovar sessão em vez de derrubar o site (504).
  }

  return supabaseResponse;
}
