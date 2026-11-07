"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isFilhoDeSanto } from "@/lib/filho";
import { formatDateTime } from "@/lib/format";

export default function FilhoAjodunPage() {
  const { state, currentUser, requestAjodunAccess } = useAppStore();
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const events = useMemo(
    () =>
      (state.ajodunEvents ?? [])
        .filter((e) => e.published)
        .sort((a, b) =>
          (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at),
        ),
    [state.ajodunEvents],
  );

  const myMemberships = useMemo(
    () =>
      (state.ajodunMemberships ?? []).filter((m) => m.user_id === currentUser?.id),
    [state.ajodunMemberships, currentUser?.id],
  );

  if (!isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  function statusFor(eventId: string) {
    return myMemberships.find((m) => m.ajodun_event_id === eventId);
  }

  function onRequest(eventId: string) {
    setError("");
    setOkMsg("");
    const result = requestAjodunAccess(eventId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOkMsg("Pedido enviado. O administrador libera o acesso à planilha.");
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Ajodun"
        subtitle="Escolha o ajodun a que você pertence. Após a liberação do Admin, a planilha fica disponível aqui."
        backHref="/filho"
        backLabel="Início"
      />

      {error ? <ErrorMessage message={error} /> : null}
      {okMsg ? (
        <p className="rounded-xl bg-leaf/15 px-3 py-2 text-sm text-navy/80">{okMsg}</p>
      ) : null}

      <div className="grid gap-3">
        {events.map((ev) => {
          const membership = statusFor(ev.id);
          const approved = membership?.status === "approved";
          const requested = membership?.status === "requested";
          const rejected = membership?.status === "rejected";
          return (
            <Card key={ev.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{ev.title}</CardTitle>
                  {ev.theme ? (
                    <p className="mt-1 text-sm text-navy/60">{ev.theme}</p>
                  ) : null}
                  {ev.scheduled_at ? (
                    <p className="mt-1 text-xs text-navy/45">
                      {formatDateTime(ev.scheduled_at)}
                    </p>
                  ) : null}
                </div>
                {approved ? (
                  <Badge tone="success">Liberado</Badge>
                ) : requested ? (
                  <Badge tone="warning">Aguardando</Badge>
                ) : rejected ? (
                  <Badge tone="danger">Recusado</Badge>
                ) : (
                  <Badge tone="info">Disponível</Badge>
                )}
              </div>

              {ev.notes ? (
                <p className="mt-3 text-sm text-navy/70 whitespace-pre-wrap">{ev.notes}</p>
              ) : null}

              {approved ? (
                <div className="mt-4 space-y-3">
                  {ev.sheet_url ? (
                    <a
                      href={ev.sheet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-gold-deep underline"
                    >
                      Abrir planilha do ajodun <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <p className="text-sm text-navy/55">
                      Planilha ainda não cadastrada pelo Admin.
                    </p>
                  )}
                  {ev.tasks?.length ? (
                    <ul className="space-y-1 text-sm text-navy/70">
                      {ev.tasks.map((t) => (
                        <li key={t.id} className={t.done ? "line-through opacity-60" : ""}>
                          {t.done ? "✓ " : "○ "}
                          {t.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <Button
                    variant="gold"
                    size="sm"
                    disabled={requested}
                    onClick={() => onRequest(ev.id)}
                  >
                    {requested
                      ? "Pedido enviado"
                      : rejected
                        ? "Pedir novamente"
                        : "Este é o meu ajodun"}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {events.length === 0 ? (
          <EmptyState title="Nenhum ajodun publicado ainda" />
        ) : null}
      </div>
    </div>
  );
}
