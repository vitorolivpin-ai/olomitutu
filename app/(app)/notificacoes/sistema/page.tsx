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

export default function SystemNotificationsPage() {
  const { state, currentUser, markNotificationRead } = useAppStore();
  const items = notificationsForRole(state.notifications, currentUser?.role, {
    clientId: currentUser?.client_id,
  });

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Notificações do sistema"
        subtitle={`Alertas automáticos do ${appLabelForRole(currentUser?.role)}${
          currentUser ? ` · ${roleLabel(currentUser.role)}` : ""
        }`}
        backHref="/notificacoes"
        backLabel="Central de Avisos"
      />
      <div className="grid gap-3">
        {items.map((notification) => {
          const content = (
            <Card
              className={cn(!notification.read && "border-l-4 border-l-gold")}
              onClick={() => markNotificationRead(notification.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy">{notification.title}</p>
                <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy/55">
                  {typeLabel[notification.type] ?? notification.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-navy/70">{notification.body}</p>
              <p className="mt-2 text-xs text-navy/45">{formatDateTime(notification.created_at)}</p>
            </Card>
          );
          return notification.href ? (
            <Link key={notification.id} href={notification.href}>
              {content}
            </Link>
          ) : (
            <div key={notification.id}>{content}</div>
          );
        })}
        {items.length === 0 ? (
          <EmptyState title="Sem notificações automáticas para este perfil" />
        ) : null}
      </div>
    </div>
  );
}