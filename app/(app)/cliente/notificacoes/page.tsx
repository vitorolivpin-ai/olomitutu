"use client";

import Link from "next/link";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { notificationsForRole } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const typeLabel: Record<string, string> = {
  agenda: "Agenda",
  chat: "Mensagem",
  biblioteca: "Biblioteca",
  sistema: "Sistema",
};

export default function ClienteNotificacoesPage() {
  const { state, currentUser, markNotificationRead } = useAppStore();

  if (currentUser?.role !== "cliente") {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  const items = notificationsForRole(state.notifications, "cliente", {
    clientId: currentUser.client_id,
  });

  return (
    <div className="animate-rise space-y-5">
      <div>
        <p className="text-sm font-medium text-gold-deep">App do Cliente</p>
        <h1 className="font-display text-3xl text-navy">Notificações</h1>
        <p className="text-sm text-navy/60">
          Mensagens do Pai, horários liberados e novidades da biblioteca.
        </p>
      </div>

      <InstallAppBanner force />
      <EnablePushBanner forClient />

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
            title="Nenhuma notificação"
            description="Quando o Pai responder, liberar horário ou publicar na biblioteca, aparece aqui."
          />
        ) : null}
      </div>
    </div>
  );
}
