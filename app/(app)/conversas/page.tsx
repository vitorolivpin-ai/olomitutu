"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { messagePreview } from "@/lib/chat";
import { formatDateTime } from "@/lib/format";
import { canAccess } from "@/lib/permissions";

export default function ConversationsPage() {
  const { state, currentUser } = useAppStore();

  if (!canAccess(currentUser?.role, "chat")) {
    return (
      <EmptyState
        title="Conversas indisponíveis"
        description="Financeiro não acessa conversas privadas sem autorização."
      />
    );
  }

  const clientIds =
    currentUser?.role === "cliente"
      ? [currentUser.client_id].filter(Boolean)
      : Array.from(new Set(state.messages.map((m) => m.client_id).concat(state.clients.map((c) => c.id))));

  const threads = (clientIds as string[])
    .map((clientId) => {
      const client = state.clients.find((c) => c.id === clientId);
      const msgs = state.messages
        .filter((m) => m.client_id === clientId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = msgs[msgs.length - 1];
      return { client, last, count: msgs.length };
    })
    .filter((t) => t.client)
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Conversas</h1>
        <p className="text-sm text-navy/60">
          Mensagens do App do Cliente aparecem aqui em tempo real — responda e chega direto lá.
        </p>
      </div>

      <div className="grid gap-3">
        {threads.map(({ client, last, count }) => (
          <Link key={client!.id} href={`/conversas/${client!.id}`}>
            <Card className="hover:border-gold/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-navy">{client!.full_name}</p>
                  <p className="line-clamp-1 text-sm text-navy/60">
                    {messagePreview(last)}
                  </p>
                </div>
                <div className="text-right text-xs text-navy/50">
                  <p>{count}</p>
                  <p>{last ? formatDateTime(last.created_at) : ""}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {threads.length === 0 ? <EmptyState title="Nenhuma conversa" /> : null}
      </div>
    </div>
  );
}
