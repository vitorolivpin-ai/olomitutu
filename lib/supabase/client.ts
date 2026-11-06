"use client";

import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

export { isSupabaseConfigured };

let browserClient: SupabaseClient | null = null;

/**
 * Cliente Supabase único no browser (sessão em cookies via @supabase/ssr).
 * Singleton evita vários GoTrue competindo e disparando SIGNED_OUT no celular.
 */
export function createBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;
  const { url, anonKey } = getSupabasePublicEnv();
  browserClient = createSsrBrowserClient(url, anonKey);
  return browserClient;
}
