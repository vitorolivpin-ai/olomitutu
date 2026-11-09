import { NextRequest, NextResponse } from "next/server";

/**
 * Placeholder seguro para entrega de comprovante privado.
 * No MVP local o Pai lê o arquivo via estado privado do app.
 * Com Supabase: validar session Pai dono OU token de acesso do atendimento,
 * então assinar URL do bucket privado `jogo-comprovantes` (migration 031).
 * Admin / Financeiro: sempre negado.
 */
export async function GET(req: NextRequest) {
  const appointmentId = req.nextUrl.searchParams.get("appointment_id");
  const token = req.nextUrl.searchParams.get("token");
  if (!appointmentId) {
    return NextResponse.json({ ok: false, error: "appointment_id obrigatório" }, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Comprovante disponível apenas no armazenamento privado do atendimento. Integração de URL assinada pendente no remoto.",
      appointment_id: appointmentId,
      token_present: Boolean(token),
      policy: {
        pai_de_santo: "permitido se dono",
        visitante: "permitido com token válido do atendimento",
        administrador: "negado",
        tesouraria: "negado",
      },
    },
    { status: 501 },
  );
}
