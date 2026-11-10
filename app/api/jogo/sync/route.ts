import { NextRequest, NextResponse } from "next/server";
import { isJogoRemoteEnabled } from "@/lib/jogo/persistence";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { fetchOwnedJogos } from "@/lib/supabase/jogo";

/** Sincroniza Jogos do Pai autenticado (RLS 030 + colunas 031). */
export async function GET(req: NextRequest) {
  if (!isJogoRemoteEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Persistência remota de Jogo desativada.",
        code: "JOGO_REMOTE_OFF",
      },
      { status: 503 },
    );
  }

  const client = createRouteHandlerClient(req);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Supabase não configurado." }, { status: 503 });
  }

  const {
    data: { user },
  } = await client.supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Autenticação necessária." }, { status: 401 });
  }

  const { data: role } = await client.supabase.rpc("current_role");
  if (role !== "pai_de_santo") {
    return client.applyCookies(
      NextResponse.json(
        { ok: false, error: "Somente o Pai de Santo pode sincronizar Jogos." },
        { status: 403 },
      ),
    );
  }

  await client.supabase.rpc("jogo_refresh_deadlines");
  const bundle = await fetchOwnedJogos(client.supabase);

  if (bundle.missing) {
    return client.applyCookies(
      NextResponse.json(
        {
          ok: false,
          error:
            "Migration 031 ainda não aplicada neste ambiente. Aplique em staging antes de ativar o remoto.",
          code: "JOGO_MIGRATION_MISSING",
        },
        { status: 503 },
      ),
    );
  }

  return client.applyCookies(
    NextResponse.json({
      ok: true,
      appointments: bundle.appointments,
      clients: bundle.clients,
    }),
  );
}
