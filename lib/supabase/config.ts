/** True quando URL e anon key públicas estão definidas (não placeholders). */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) return false;
  if (url.includes("YOUR_PROJECT") || url.includes("your-project")) return false;
  if (anon.includes("your-anon")) return false;
  return true;
}

export function getSupabasePublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

/**
 * Origem pública do app (links de e-mail Auth).
 * Prefere NEXT_PUBLIC_SITE_URL para não cair em localhost.
 */
export function getAppOrigin() {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}
