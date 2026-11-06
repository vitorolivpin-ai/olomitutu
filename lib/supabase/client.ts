"use client";

import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

export { isSupabaseConfigured };

/**
 * Cliente Supabase para o browser (sessão em cookies via @supabase/ssr).
 * Retorna null se Auth ainda não estiver configurado.
 */
export function createBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabasePublicEnv();
  return createSsrBrowserClient(url, anonKey);
}
