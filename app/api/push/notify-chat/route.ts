import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { isWebPushConfigured, sendWebPush } from "@/lib/server/web-push";

export const runtime = "nodejs";

type Body = {
  client_id?: string;
  preview?: string;
  sender_name?: string;
  /** Quem deve receber: staff (Pai), tesouraria ou o cliente da conversa */
  audience?: "staff" | "tesouraria" | "cliente";
  channel?: "casa" | "financeiro";
};

export async function POST(req: NextRequest) {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: "vapid" });
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

  const body = (await req.json().catch(() => ({}))) as Body;
  const { data: profile } = await client.supabase
    .from("profiles")
    .select("role, client_id, approval_status")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role as string | undefined;
  if (
    profile?.approval_status !== "approved" ||
    (role !== "pai_de_santo" && role !== "cliente")
  ) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  if (body.audience === "tesouraria") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  const audience = body.audience === "cliente" ? "cliente" : "staff";
  if (
    (role === "cliente" && (audience !== "staff" || profile.client_id !== body.client_id)) ||
    (role === "pai_de_santo" && !body.client_id)
  ) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY ausente — não dá para enviar push." },
      { status: 503 },
    );
  }

  let userIds: string[] = [];
  const { data: ownedClient } = await admin
    .from("clients")
    .select("id, responsible_profile_id")
    .eq("id", body.client_id)
    .maybeSingle();
  if (
    !ownedClient ||
    (role === "pai_de_santo" && ownedClient.responsible_profile_id !== user.id) ||
    (role === "cliente" && ownedClient.id !== profile.client_id)
  ) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  if (audience === "staff") {
    const recipientId = role === "pai_de_santo" ? user.id : ownedClient.responsible_profile_id;
    userIds = recipientId ? [recipientId] : [];
  } else {
    const { data: clients } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "cliente")
      .eq("client_id", body.client_id);
    userIds = (clients ?? []).map((p) => p.id as string);
  }

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, subscription")
    .in("user_id", userIds);

  const title =
    audience === "cliente"
      ? body.channel === "financeiro"
        ? "Mensagem do Financeiro"
        : "Mensagem da casa"
      : "Nova mensagem da casa";
  const preview = (body.preview || "Abra o chat").slice(0, 120);
  const sender = body.sender_name?.trim();
  const notifBody = sender ? `${sender}: ${preview}` : preview;
  const url =
    audience === "cliente"
      ? body.channel === "financeiro"
        ? "/cliente/financeiro-chat"
        : "/cliente/mensagens"
      : `/conversas/${body.client_id}`;

  let sent = 0;
  for (const row of subs ?? []) {
    const result = await sendWebPush(row.subscription as object, {
      title,
      body: notifBody,
      url,
      tag: body.client_id ? `chat-${body.client_id}` : "chat",
    });
    if (result.ok) {
      sent += 1;
    } else if (result.gone) {
      await admin.from("push_subscriptions").delete().eq("id", row.id);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
