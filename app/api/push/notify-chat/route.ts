import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { isWebPushConfigured, sendWebPush } from "@/lib/server/web-push";

export const runtime = "nodejs";

type Body = {
  client_id?: string;
  preview?: string;
  sender_name?: string;
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
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY ausente — não dá para notificar o Pai." },
      { status: 503 },
    );
  }

  const { data: staff } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["pai_de_santo", "administrador"]);

  const staffIds = (staff ?? []).map((p) => p.id as string);
  if (staffIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, subscription")
    .in("user_id", staffIds);

  const title = "Nova mensagem";
  const preview = (body.preview || "Abra Conversas").slice(0, 120);
  const sender = body.sender_name?.trim();
  const notifBody = sender ? `${sender}: ${preview}` : preview;
  const url = body.client_id ? `/conversas/${body.client_id}` : "/conversas";

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
