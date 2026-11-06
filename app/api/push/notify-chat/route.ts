import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { isWebPushConfigured, sendWebPush } from "@/lib/server/web-push";

export const runtime = "nodejs";

type Body = {
  client_id?: string;
  preview?: string;
  sender_name?: string;
  /** Quem deve receber: staff (Pai) ou o cliente da conversa */
  audience?: "staff" | "cliente";
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
  const audience = body.audience === "cliente" ? "cliente" : "staff";
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY ausente — não dá para enviar push." },
      { status: 503 },
    );
  }

  let userIds: string[] = [];

  if (audience === "staff") {
    const { data: staff } = await admin
      .from("profiles")
      .select("id")
      .in("role", ["pai_de_santo", "administrador"]);
    userIds = (staff ?? []).map((p) => p.id as string);
  } else {
    if (!body.client_id) {
      return NextResponse.json({ ok: true, sent: 0, reason: "sem client_id" });
    }
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

  const title = audience === "cliente" ? "Mensagem do Pai" : "Nova mensagem";
  const preview = (body.preview || "Abra o chat").slice(0, 120);
  const sender = body.sender_name?.trim();
  const notifBody = sender ? `${sender}: ${preview}` : preview;
  const url =
    audience === "cliente"
      ? "/cliente/mensagens"
      : body.client_id
        ? `/conversas/${body.client_id}`
        : "/conversas";

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
    } else if (result.error.toLowerCase().includes("gone") || result.error.includes("410")) {
      await admin.from("push_subscriptions").delete().eq("id", row.id);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
