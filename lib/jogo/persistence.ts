import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Fonte de verdade do fluxo de Jogo.
 * - local: demo Etapa 2 (AppState / sessionStorage) — isolado do remoto
 * - remote: Supabase é a fonte de verdade (staging/produção após migration 031)
 *
 * Ativar remoto somente com NEXT_PUBLIC_JOGO_REMOTE=1 e Supabase configurado.
 * Nunca misturar dados demo com dados reais.
 */
export type JogoPersistenceMode = "local" | "remote";

export function getJogoPersistenceMode(): JogoPersistenceMode {
  if (!isSupabaseConfigured()) return "local";
  const flag = (process.env.NEXT_PUBLIC_JOGO_REMOTE ?? "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "remote") return "remote";
  return "local";
}

export function isJogoRemoteEnabled() {
  return getJogoPersistenceMode() === "remote";
}

export function jogoPersistenceLabel(mode = getJogoPersistenceMode()) {
  return mode === "remote" ? "Supabase (remoto)" : "Demo local";
}
