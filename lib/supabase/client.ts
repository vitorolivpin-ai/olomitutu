import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para o browser.
 * Usa apenas a chave pública (anon). Segredos ficam no servidor / .env.local.
 */
export function createBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || url.includes("your-project") || anon.includes("your-anon")) {
    return null;
  }
  return createClient(url, anon);
}

export function isSupabaseConfigured() {
  return createBrowserClient() !== null;
}
