"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { messagePreview } from "@/lib/chat";
import { formatDateTime } from "@/lib/format";
import { canAccess } from "@/lib/permissions";

export default function ConversationsPage() {
  const router = useRouter();
  const { state, currentUser, hideStaffChat } = useAppStore();

  if (!canAccess(currentUser?.role, "chat")) {
    return (
      <EmptyState
        title="Conversas indisponíveis"
        description="Financeiro não acessa conversas privadas sem autorização."
      />
    );
  }

  const isStaff = currentUser?.role !== "cliente";
  const hidden = new Set(state.staffHiddenClientIds ?? []);

  const clientIds =
    currentUser?.role === "cliente"
      ? [currentUser.client_id].filter(Boolean)
      : Array.from(
          new Set(state.messages.map((m) => m.client_id).concat(state.clients.map((c) => c.id))),
        );

  const threads = (clientIds as string[])
    .map((clientId) => {
      const client = state.clients.find((c) => c.id === clientId);
      const msgs = state.messages
        .filter((m) => m.client_id === clientId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = msgs[msgs.length - 1];
      return { client, last, count: msgs.length, clientId };
    })
    .filter((t) => t.client)
    .filter((t) => !(isStaff && hidden.has(t.clientId)))
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));

  function onHide(clientId: string) {
    if (
      !confirm(
        "Remover esta conversa da sua lista? O cliente continua vendo o histórico completo (áudios, vídeos e textos).",
      )
    ) {
      return;
    }
    hideStaffChat(clientId);
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Conversas</h1>
        <p className="text-sm text-navy/60">
          Mensagens do App do Cliente. Você pode limpar a lista da casa; o cliente mantém o
          histórico.
        </p>
      </div>

      <div className="grid gap-3">
        {threads.map(({ client, last, count, clientId }) => (
          <Card key={client!.id} className="hover:border-gold/40">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Link href={`/conversas/${client!.id}`} className="min-w-0 flex-1">
                <p className="font-display text-xl text-navy">{client!.full_name}</p>
                <p className="line-clamp-1 text-sm text-navy/60">{messagePreview(last)}</p>
                <p className="mt-1 text-xs text-navy/45">
                  {count} msg · {last ? formatDateTime(last.created_at) : ""}
                </p>
              </Link>
              {isStaff ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    onHide(clientId);
                    if (typeof window !== "undefined" && window.location.pathname.includes(clientId)) {
                      router.push("/conversas");
                    }
                  }}
                >
                  Excluir da minha lista
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
        {threads.length === 0 ? (
          <EmptyState
            title="Nenhuma conversa"
            description={
              isStaff
                ? "Quando o cliente mandar mensagem, aparece aqui de novo."
                : undefined
            }
          />
        ) : null}
      </div>
    </div>
  );
}
