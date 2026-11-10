import { NextRequest, NextResponse } from "next/server";
import { hashJogoToken } from "@/lib/jogo/token-hash";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";

export const runtime = "nodejs";

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
  /** Visitante: appointment id */
  jogo_id?: string;
  access_token?: string;
  guest_secret?: string;
};

function detectPlatform(ua: string) {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/windows/i.test(ua)) return "windows";
  if (/mac os|macintosh/i.test(ua)) return "macos";
  return "web";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Inscrição inválida." }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const environment =
    process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const stamp = new Date().toISOString();
  const subscriptionJson = {
    endpoint: body.endpoint,
    expirationTime: body.expirationTime ?? null,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  };

  const jogoId = body.jogo_id?.trim();
  const accessToken = body.access_token?.trim();
  const guestSecret = body.guest_secret?.trim();
  const isVisitor = Boolean(jogoId && (accessToken || guestSecret));

  if (isVisitor) {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY ausente — não dá para salvar push do visitante." },
        { status: 503 },
      );
    }

    const { data: apt, error } = await admin
      .from("appointments")
      .select(
        "id, jogo_status, guest_session_token_hash, public_access_token_hash, public_access_expires_at, public_access_revoked_at",
      )
      .eq("id", jogoId!)
      .maybeSingle();

    if (error || !apt) {
      return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });
    }

    let visitorHash = "";
    if (accessToken) {
      const hash = hashJogoToken(accessToken);
      const tokenOk =
        apt.public_access_token_hash === hash &&
        !apt.public_access_revoked_at &&
        (!apt.public_access_expires_at ||
          new Date(apt.public_access_expires_at as string).getTime() > Date.now());
      if (!tokenOk) {
        return NextResponse.json(
          { error: "Token de acesso inválido ou expirado." },
          { status: 403 },
        );
      }
      visitorHash = hash;
    } else if (guestSecret) {
      const hash = hashJogoToken(guestSecret);
      if (apt.guest_session_token_hash !== hash) {
        return NextResponse.json({ error: "Sessão de visitante inválida." }, { status: 403 });
      }
      if (
        apt.jogo_status &&
        !["aguardando_pagamento", "comprovante_enviado", "aguardando_aprovacao", "prazo_analise_atingido", "confirmado"].includes(
          apt.jogo_status as string,
        )
      ) {
        return NextResponse.json(
          { error: "Este Jogo não aceita notificações no status atual." },
          { status: 403 },
        );
      }
      visitorHash = hash;
    }

    const { error: upsertError } = await admin.from("push_subscriptions").upsert(
      {
        user_id: null,
        jogo_id: jogoId,
        visitor_token_hash: visitorHash,
        endpoint: body.endpoint,
        subscription: subscriptionJson,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: ua.slice(0, 500),
        platform: detectPlatform(ua),
        active: true,
        environment,
        revoked_at: null,
        failed_at: null,
        updated_at: stamp,
      },
      { onConflict: "endpoint" },
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, audience: "visitante" });
  }

  // Pai autenticado (ou outros perfis do chat) — sessão
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

  const { data: profile } = await client.supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role as string | undefined;
  if (role === "administrador" || role === "tesouraria") {
    return NextResponse.json(
      { error: "Admin e Financeiro não recebem push de Jogo/Conversas neste fluxo." },
      { status: 403 },
    );
  }

  const { error } = await client.supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      jogo_id: null,
      visitor_token_hash: null,
      endpoint: body.endpoint,
      subscription: subscriptionJson,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: ua.slice(0, 500),
      platform: detectPlatform(ua),
      active: true,
      environment,
      revoked_at: null,
      failed_at: null,
      updated_at: stamp,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, audience: "autenticado" });
}
