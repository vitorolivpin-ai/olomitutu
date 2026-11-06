"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";

export default function AjodunLiberacoesPage() {
  const { state, currentUser, decideAjodunMembership } = useAppStore();

  const canManage =
    currentUser?.role === "administrador" || currentUser?.role === "pai_de_santo";

  const rows = useMemo(() => {
    return (state.ajodunMemberships ?? [])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((m) => {
        const event = (state.ajodunEvents ?? []).find((e) => e.id === m.ajodun_event_id);
        const profile = state.profiles.find((p) => p.id === m.user_id);
        return { membership: m, event, profile };
      });
  }, [state.ajodunMemberships, state.ajodunEvents, state.profiles]);

  const pending = rows.filter((r) => r.membership.status === "requested");

  if (!canManage) {
    return <EmptyState title="Só Admin ou Pai liberam ajodun" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <Link href="/ajodun" className="text-sm text-navy/55 hover:text-navy">
          ← Ajodun
        </Link>
        <h1 className="mt-2 font-display text-3xl text-navy">Liberações de ajodun</h1>
        <p className="text-sm text-navy/60">
          O filho escolhe o ajodun; você libera o acesso à planilha.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState title="Nenhum pedido aguardando" />
      ) : (
        <div className="grid gap-3">
          {pending.map(({ membership, event, profile }) => (
            <Card key={membership.id}>
              <CardTitle>{profile?.full_name ?? "Filho de Santo"}</CardTitle>
              <p className="mt-1 text-sm text-navy/65">
                Ajodun: <strong>{event?.title ?? membership.ajodun_event_id}</strong>
              </p>
              <p className="text-xs text-navy/45">
                Pedido em {formatDateTime(membership.created_at)}
              </p>
              <Badge tone="warning" className="mt-2">
                Aguardando
              </Badge>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => decideAjodunMembership(membership.id, "approved")}
                >
                  Liberar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => decideAjodunMembership(membership.id, "rejected")}
                >
                  Recusar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {rows.filter((r) => r.membership.status !== "requested").length > 0 ? (
        <div className="grid gap-3">
          <h2 className="font-display text-xl text-navy">Histórico recente</h2>
          {rows
            .filter((r) => r.membership.status !== "requested")
            .slice(0, 12)
            .map(({ membership, event, profile }) => (
              <Card key={membership.id}>
                <p className="font-medium text-navy">
                  {profile?.full_name ?? "—"} · {event?.title ?? "Ajodun"}
                </p>
                <Badge
                  tone={membership.status === "approved" ? "success" : "danger"}
                  className="mt-2"
                >
                  {membership.status === "approved" ? "Liberado" : "Recusado"}
                </Badge>
              </Card>
            ))}
        </div>
      ) : null}
    </div>
  );
}
