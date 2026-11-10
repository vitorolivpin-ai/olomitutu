import { NextRequest, NextResponse } from "next/server";
import { hashJogoToken } from "@/lib/jogo/token-hash";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";

export const runtime = "nodejs";

type Body = {
  endpoint?: string;
  jogo_id?: string;
  access_token?: string;
  guest_secret?: string;
};

/**
 * Desativa inscrição (active=false). Logout do Pai limpa flags locais;
 * revoke no servidor é explícito (visitante ou dono).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "endpoint obrigatório." }, { status: 400 });
  }

  const stamp = new Date().toISOString();
  const patch = {
    active: false,
    revoked_at: stamp,
    updated_at: stamp,
  };

  const jogoId = body.jogo_id?.trim();
  const accessToken = body.access_token?.trim();
  const guestSecret = body.guest_secret?.trim();

  if (jogoId && (accessToken || guestSecret)) {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Service role ausente." }, { status: 503 });
    }
    const hash = hashJogoToken((accessToken || guestSecret)!);
    const { error } = await admin
      .from("push_subscriptions")
      .update(patch)
      .eq("endpoint", body.endpoint)
      .eq("jogo_id", jogoId)
      .eq("visitor_token_hash", hash);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const client = createRouteHandlerClient(req);
  if (!client) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }
  const {
    data: { user },
  } = await client.supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Faça login." }, { status: 401 });
  }

  const { error } = await client.supabase
    .from("push_subscriptions")
    .update(patch)
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
