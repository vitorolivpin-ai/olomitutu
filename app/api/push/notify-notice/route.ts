import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { isWebPushConfigured, sendWebPush } from "@/lib/server/web-push";
import { sectorLabel } from "@/lib/internal-notices";
import type { InternalNotice, InternalSector, UserRole } from "@/types";

export const runtime = "nodejs";

type Body = { notice_id?: string; event?: string };

const ROLE_BY_SECTOR: Record<InternalSector, UserRole> = {
  administracao: "administrador",
  pai_de_santo: "pai_de_santo",
  financeiro: "tesouraria",
  estoque: "estoque",
  biblioteca: "biblioteca",
};

function safePushTarget(notice: InternalNotice) {
  return notice.notice_type === "filhos_announcement"
    ? "/filho/notificacoes"
    : "/notificacoes";
}

export async function POST(request: NextRequest) {
  if (!isWebPushConfigured()) return NextResponse.json({ ok: true, skipped: "vapid" });
  const sessionClient = createRouteHandlerClient(request);
  if (!sessionClient) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  const { data: { user } } = await sessionClient.supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const { data: senderProfile } = await sessionClient.supabase
    .from("profiles")
    .select("role, person_kind, approval_status")
    .eq("id", user.id)
    .maybeSingle();
  if (!senderProfile || senderProfile.approval_status !== "approved") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.notice_id) return NextResponse.json({ error: "Aviso inválido." }, { status: 400 });

  const { data: notice, error } = await sessionClient.supabase
    .from("internal_notices")
    .select("id, notice_type, title, source_sector, target_sector, target_audience, status, created_by, assigned_to")
    .eq("id", body.notice_id)
    .maybeSingle();
  if (error || !notice) return NextResponse.json({ error: "Aviso não encontrado." }, { status: 404 });

  if (notice.notice_type === "filhos_announcement") {
    if (senderProfile.role !== "administrador" || notice.created_by !== user.id) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
  } else {
    const senderSector = senderProfile.role === "administrador"
      ? "administracao"
      : senderProfile.role === "pai_de_santo"
        ? "pai_de_santo"
        : senderProfile.role === "tesouraria"
          ? "financeiro"
          : senderProfile.role === "estoque"
            ? "estoque"
            : senderProfile.role === "biblioteca"
              ? "biblioteca"
              : null;
    const createdEvent = body.event === "created" && notice.created_by === user.id && notice.source_sector === senderSector;
    const authorizedSector = senderSector && (notice.source_sector === senderSector || notice.target_sector === senderSector);
    if (!createdEvent && !authorizedSector && notice.assigned_to !== user.id && senderProfile.role !== "administrador") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Push indisponível." }, { status: 503 });

  let recipientIds: string[] = [];
  if (notice.notice_type === "filhos_announcement") {
    if (notice.status !== "publicado" || notice.target_audience !== "filhos_de_santo") {
      return NextResponse.json({ ok: true, sent: 0 });
    }
    const { data: children } = await admin.from("profiles")
      .select("id")
      .eq("role", "cliente")
      .eq("person_kind", "filho_de_santo")
      .eq("approval_status", "approved");
    recipientIds = (children ?? []).map((profile) => profile.id as string);
  } else {
    const targetRole = notice.target_sector ? ROLE_BY_SECTOR[notice.target_sector as InternalSector] : null;
    if (body.event === "created" && targetRole) {
      const { data: recipients } = await admin.from("profiles")
        .select("id")
        .eq("role", targetRole)
        .eq("approval_status", "approved");
      recipientIds = (recipients ?? []).map((profile) => profile.id as string);
    } else {
      recipientIds = [notice.created_by as string];
    }
  }

  if (recipientIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });
  const { data: subscriptions } = await admin.from("push_subscriptions")
    .select("id, endpoint, subscription")
    .in("user_id", recipientIds);

  const isAnnouncement = notice.notice_type === "filhos_announcement";
  const title = isAnnouncement
    ? "Novo aviso do ILÉ"
    : `Novo aviso para ${notice.target_sector ? sectorLabel(notice.target_sector as InternalSector) : "setor"}`;
  let sent = 0;
  for (const subscription of subscriptions ?? []) {
    const result = await sendWebPush(subscription.subscription as object, {
      title,
      body: isAnnouncement
        ? "Acesse o aplicativo para visualizar."
        : "Existe uma solicitação aguardando atenção.",
      url: safePushTarget(notice as InternalNotice),
      tag: `notice-${notice.id}`,
    });
    if (result.ok) sent += 1;
    else if (result.gone) await admin.from("push_subscriptions").delete().eq("id", subscription.id);
  }

  return NextResponse.json({ ok: true, sent });
}