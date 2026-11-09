import { NextRequest, NextResponse } from "next/server";
import { hashJogoToken } from "@/lib/jogo/token-hash";
import { requireJogoRemoteAdmin, rpcErrorMessage } from "@/lib/jogo/server";
import { mapResolveAccessToIndex } from "@/lib/supabase/jogo";
import type { JogoFlowStatus, JogoModalidade } from "@/types";

export async function GET(req: NextRequest) {
  const gate = requireJogoRemoteAdmin();
  if (!gate.ok) return gate.response;

  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token || token.length < 32) {
    return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 400 });
  }

  const { data, error } = await gate.admin.rpc("jogo_resolve_access", {
    p_token_hash: hashJogoToken(token),
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: rpcErrorMessage(error, "Falha ao validar acesso.") },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Acesso não encontrado." }, { status: 404 });
  }

  const typed = row as {
    appointment_id: string;
    expires_at: string | null;
    revoked: boolean;
    jogo_status: JogoFlowStatus;
    scheduled_at: string;
    modalidade: JogoModalidade | null;
    chat_unlocked: boolean;
    ficha_code: string | null;
    amount: number | null;
    client_id: string;
  };

  if (typed.revoked) {
    return NextResponse.json({ ok: false, error: "Acesso revogado." }, { status: 403 });
  }
  if (typed.expires_at && new Date(typed.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "Acesso expirado." }, { status: 403 });
  }

  const entry = mapResolveAccessToIndex({
    ...typed,
    access_token: token,
  });

  return NextResponse.json({ ok: true, entry });
}
