import { NextResponse } from "next/server";
import { requireJogoRemoteAdmin, rpcErrorMessage } from "@/lib/jogo/server";
import { mapOcupacaoToHold } from "@/lib/supabase/jogo";
import type { JogoFlowStatus, JogoModalidade } from "@/types";

/** Lista pública de slots ocupados — sem PII. */
export async function GET() {
  const gate = requireJogoRemoteAdmin();
  if (!gate.ok) return gate.response;

  await gate.admin.rpc("jogo_refresh_deadlines");

  const { data, error } = await gate.admin.rpc("jogo_list_ocupacao");
  if (error) {
    return NextResponse.json(
      { ok: false, error: rpcErrorMessage(error, "Falha ao listar ocupação.") },
      { status: 500 },
    );
  }

  const holds = ((data ?? []) as Array<{
    appointment_id: string;
    scheduled_at: string;
    expires_at: string | null;
    jogo_status: JogoFlowStatus;
    modalidade: JogoModalidade | null;
  }>).map(mapOcupacaoToHold);

  return NextResponse.json({ ok: true, holds });
}
