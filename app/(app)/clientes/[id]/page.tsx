"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDate, formatDateTime, formatDuration } from "@/lib/format";
import { canAccess } from "@/lib/permissions";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, currentUser, addInternalNote, removeClient } = useAppStore();
  const client = state.clients.find((c) => c.id === params.id);
  const [note, setNote] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (!client) {
    return <EmptyState title="Cliente não encontrado" />;
  }

  const currentClient = client;

  if (currentUser?.role === "cliente" && currentUser.client_id !== currentClient.id) {
    return <EmptyState title="Acesso negado" description="Você só pode ver seus próprios dados." />;
  }

  const appointments = state.appointments
    .filter((a) => a.client_id === currentClient.id)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const upcoming = appointments.filter((a) =>
    ["SOLICITADO", "CONFIRMADO", "EM_ATENDIMENTO"].includes(a.status),
  );
  const past = appointments.filter((a) =>
    ["REALIZADO", "CANCELADO", "NAO_COMPARECEU"].includes(a.status),
  );
  const messages = state.messages.filter((m) => m.client_id === currentClient.id);
  const notes = state.internalNotes.filter((n) => n.client_id === currentClient.id);
  const canSeeNotes = canAccess(currentUser?.role, "internal_notes");
  const canManage =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";

  function onNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    addInternalNote(currentClient.id, note.trim());
    setNote("");
  }

  async function onDelete() {
    if (
      !confirm(
        `Excluir “${currentClient.full_name}”?\n\nRemove jogos, mensagens e anotações ligados a esta pessoa.`,
      )
    ) {
      return;
    }
    setDeleteError("");
    setDeleting(true);
    const result = await removeClient(currentClient.id);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    router.replace("/clientes");
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title={currentClient.full_name}
        subtitle={`${currentClient.phone}${
          currentClient.email ? ` · ${currentClient.email}` : ""
        } · desde ${formatDate(currentClient.created_at)}`}
        backHref="/clientes"
        backLabel="Clientes"
      />
      <div className="flex flex-wrap items-center justify-center gap-3 empty:hidden">
        {deleteError ? <p className="text-sm text-danger">{deleteError}</p> : null}
        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={deleting}
            onClick={() => void onDelete()}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Excluindo…" : "Excluir cliente"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-navy/55">Jogos realizados</p>
          <p className="font-display text-2xl">{past.filter((a) => a.status === "REALIZADO").length}</p>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Próximos</p>
          <p className="font-display text-2xl">{upcoming.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Mensagens</p>
          <p className="font-display text-2xl">{messages.length}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Próximos atendimentos</CardTitle>
          <Link href={`/conversas/${currentClient.id}`}>
            <Button size="sm" variant="secondary">Abrir conversa</Button>
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {upcoming.map((a) => (
            <li key={a.id}>
              <Link href={`/atendimentos/${a.id}`} className="flex items-center justify-between rounded-2xl bg-mist/70 p-3">
                <span>{formatDateTime(a.scheduled_at)}</span>
                <Badge tone={feeStatusTone(a.status)}>{a.status.replaceAll("_", " ")}</Badge>
              </Link>
            </li>
          ))}
          {upcoming.length === 0 ? <p className="text-sm text-navy/55">Nenhum próximo.</p> : null}
        </ul>
      </Card>

      <Card>
        <CardTitle>Atendimentos anteriores</CardTitle>
        <ul className="mt-3 space-y-2">
          {past.map((a) => {
            const duration =
              a.started_at && a.ended_at
                ? formatDuration(new Date(a.ended_at).getTime() - new Date(a.started_at).getTime())
                : null;
            return (
              <li key={a.id} className="flex items-center justify-between rounded-2xl bg-mist/70 p-3 text-sm">
                <div>
                  <p>{formatDateTime(a.scheduled_at)}</p>
                  {duration ? <p className="text-xs text-navy/55">Duração {duration}</p> : null}
                </div>
                <Badge tone={feeStatusTone(a.status)}>{a.status.replaceAll("_", " ")}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>

      {currentClient.notes ? (
        <Card>
          <CardTitle>Observações autorizadas</CardTitle>
          <p className="mt-2 text-sm text-navy/75">{currentClient.notes}</p>
        </Card>
      ) : null}

      {canSeeNotes ? (
        <Card>
          <CardTitle>Anotações internas</CardTitle>
          <p className="mt-1 text-xs text-danger">Nunca aparecem para o cliente.</p>
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-2xl border border-navy/10 bg-cream/60 p-3 text-sm">
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-navy/50">
                  {n.author_name} · {formatDateTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
          <form onSubmit={onNote} className="mt-3 space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nova anotação interna..."
              rows={3}
            />
            <Button type="submit">Salvar anotação</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
