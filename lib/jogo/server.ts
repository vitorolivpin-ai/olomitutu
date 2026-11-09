import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isJogoRemoteEnabled } from "@/lib/jogo/persistence";
import {
  JOGO_PROOF_MAX_BYTES,
  JOGO_PROOF_MIME,
} from "@/lib/jogo";

/** Garante flag remota + service role antes de tocar o banco. */
export function requireJogoRemoteAdmin() {
  if (!isJogoRemoteEnabled()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Persistência remota de Jogo desativada. Defina NEXT_PUBLIC_JOGO_REMOTE=1 em staging após aplicar a migration 031.",
          code: "JOGO_REMOTE_OFF",
        },
        { status: 503 },
      ),
    };
  }
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "SUPABASE_SERVICE_ROLE_KEY ausente. Necessária apenas no servidor para o fluxo público de Jogo.",
          code: "JOGO_SERVICE_ROLE_MISSING",
        },
        { status: 503 },
      ),
    };
  }
  return { ok: true as const, admin };
}

export function validateProofMeta(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  if (!JOGO_PROOF_MIME.includes(file.type as (typeof JOGO_PROOF_MIME)[number])) {
    return { ok: false, error: "Envie JPG, PNG ou PDF." };
  }
  if (file.size <= 0 || file.size > JOGO_PROOF_MAX_BYTES) {
    return { ok: false, error: "O arquivo deve ter no máximo 5 MB." };
  }
  return { ok: true };
}

export function rpcErrorMessage(error: { message?: string } | null, fallback: string) {
  const raw = error?.message ?? fallback;
  if (/horário indisponível/i.test(raw)) return "Este horário acabou de ser preenchido.";
  if (/reserva expirada/i.test(raw)) return "A reserva temporária expirou. Escolha outro horário.";
  if (/sessão inválida/i.test(raw)) return "Sessão do visitante inválida.";
  if (/not authorized/i.test(raw)) return "Somente o Pai de Santo pode decidir sobre o Jogo.";
  if (/jogo não encontrado/i.test(raw)) return "Este Jogo não está sob sua responsabilidade.";
  if (/responsável do Jogo indisponível/i.test(raw)) {
    return "Não há Pai de Santo aprovado disponível para receber o Jogo.";
  }
  return raw;
}
