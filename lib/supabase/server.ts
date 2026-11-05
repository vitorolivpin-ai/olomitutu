/**
 * Placeholder para cliente server-side do Supabase.
 * Quando as credenciais estiverem disponíveis, use @supabase/ssr createServerClient
 * com cookies do Next.js App Router.
 *
 * Nunca exponha SUPABASE_SERVICE_ROLE_KEY no frontend.
 */
export function getSupabaseServerConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}
