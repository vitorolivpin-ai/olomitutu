"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { notificationsForRole } from "@/lib/notifications";
import { appLabelForRole, roleLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const typeLabel: Record<string, string> = {
  agenda: "Agenda",
  financeiro: "Financeiro",
  chat: "Mensagem",
  estoque: "Estoque",
  biblioteca: "Biblioteca",
  sistema: "Sistema",
};

export default function NotificationsPage() {
  const { state, currentUser, markNotificationRead } = useAppStore();
  const items = notificationsForRole(state.notifications, currentUser?.role, {
    clientId: currentUser?.client_id,
  });

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Notificações"
        subtitle={`Avisos do ${appLabelForRole(currentUser?.role)}${
          currentUser ? ` · ${roleLabel(currentUser.role)}` : ""
        }`}
      />

      <div className="grid gap-3">
        {items.map((n) => {
          const content = (
            <Card
              className={cn(!n.read && "border-l-4 border-l-gold")}
              onClick={() => markNotificationRead(n.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy">{n.title}</p>
                <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy/55">
                  {typeLabel[n.type] ?? n.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-navy/70">{n.body}</p>
              <p className="mt-2 text-xs text-navy/45">{formatDateTime(n.created_at)}</p>
            </Card>
          );
          return n.href ? (
            <Link key={n.id} href={n.href}>
              {content}
            </Link>
          ) : (
            <div key={n.id}>{content}</div>
          );
        })}
        {items.length === 0 ? (
          <EmptyState
            title="Sem notificações para este perfil"
            description="Só aparecem avisos relacionados a esta aba."
          />
        ) : null}
      </div>
    </div>
  );
}
