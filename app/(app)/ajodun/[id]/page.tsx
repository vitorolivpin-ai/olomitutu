"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { canAccess, canManageHouseContent } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default function AjodunDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, currentUser, toggleAjodunTask } = useAppStore();
  const canEdit = canManageHouseContent(currentUser?.role);

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  const event = (state.ajodunEvents ?? []).find((e) => e.id === params.id);
  if (!event || (!event.published && !canEdit)) {
    return (
      <EmptyState
        title="Ajodun não encontrado"
        action={
          <Link href="/ajodun">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BrandPageHeader
          title={event.title}
          subtitle={event.theme || undefined}
          backHref="/ajodun"
          backLabel="Ajodun"
        />
        {event.scheduled_at ? (
          <p className="mt-1 text-center text-xs text-navy/45">{formatDateTime(event.scheduled_at)}</p>
        ) : null}
      </div>

      {event.notes ? (
        <Card>
          <CardTitle>Observações</CardTitle>
          <p className="mt-2 whitespace-pre-wrap text-sm text-navy/70">{event.notes}</p>
        </Card>
      ) : null}

      {event.sheet_url ? (
        <a href={event.sheet_url} target="_blank" rel="noreferrer" className="block">
          <Card className="border-l-4 border-l-gold transition hover:border-gold/50">
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" /> Planilha compartilhada
            </CardTitle>
            <p className="mt-2 text-sm text-navy/60">
              Abra o controle de gastos e organização com transparência para todos.
            </p>
          </Card>
        </a>
      ) : null}

      <Card>
        <CardTitle>Checklist do ajodun</CardTitle>
        <ul className="mt-3 space-y-2">
          {event.tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => toggleAjodunTask(event.id, task.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm",
                  task.done ? "bg-success/10 text-navy" : "bg-mist/80 text-navy/80",
                  canEdit && "hover:bg-navy/5",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md border text-[10px]",
                    task.done
                      ? "border-success bg-success text-white"
                      : "border-navy/25 bg-white",
                  )}
                >
                  {task.done ? "✓" : ""}
                </span>
                {task.label}
              </button>
            </li>
          ))}
        </ul>
        {!canEdit ? (
          <p className="mt-3 text-xs text-navy/45">
            A marcação das tarefas fica com quem organiza (Pai de Santo / casa).
          </p>
        ) : null}
      </Card>
    </div>
  );
}
