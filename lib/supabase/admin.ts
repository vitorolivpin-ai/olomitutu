import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

/** Cliente com service role — só em Route Handlers / server. */
export function createAdminClient() {
  if (!isSupabaseConfigured()) return null;
  const { url } = getSupabasePublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
