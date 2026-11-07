"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { canAccess, canManageHouseContent } from "@/lib/permissions";
import { uid } from "@/lib/utils";

const DEFAULT_TASKS = [
  "Definir data e horário",
  "Lista de compras / oferendas",
  "Equipe de limpeza e organização",
  "Controle de gastos (planilha compartilhada)",
  "Comunicar a comunidade",
];

export default function AjodunPage() {
  const { state, currentUser, upsertAjodunEvent, removeAjodunEvent } = useAppStore();
  const canEdit = canManageHouseContent(currentUser?.role);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  const events = (state.ajodunEvents ?? [])
    .filter((e) => canEdit || e.published)
    .sort((a, b) => (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = upsertAjodunEvent({
      title,
      theme,
      sheet_url: sheetUrl,
      notes,
      published: true,
      tasks: DEFAULT_TASKS.map((label) => ({ id: uid("task"), label, done: false })),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setTheme("");
    setSheetUrl("");
    setNotes("");
    setWriting(false);
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Ajodun"
        subtitle="Organização com tarefas padrão e link da planilha compartilhada"
        backHref="/conteudo"
        backLabel="Conteúdo da casa"
      />
      <div className="flex flex-wrap items-center justify-center gap-3 empty:hidden">
        {currentUser?.role === "administrador" ||
        currentUser?.role === "pai_de_santo" ? (
          <Link
            href="/ajodun/liberacoes"
            className="text-sm font-medium text-gold-deep"
          >
            Ver pedidos de liberação →
          </Link>
        ) : null}
        {canEdit ? (
          <Button onClick={() => setWriting((v) => !v)}>
            {writing ? "Fechar" : "Novo ajodun"}
          </Button>
        ) : null}
      </div>

      <Card className="border-l-4 border-l-gold">
        <p className="text-sm text-navy/75">
          Esta área começa com o essencial (tarefas + planilha de transparência). O molde
          completo — personalização profunda por festa — a gente detalha juntos depois,
          porque realmente é grande.
        </p>
      </Card>

      {writing && canEdit ? (
        <Card>
          <CardTitle>Cadastrar ajodun</CardTitle>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Tema / orixá (opcional)</Label>
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} />
            </div>
            <div>
              <Label>Link da planilha compartilhada</Label>
              <Input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/…"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit">Criar com checklist padrão</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {events.map((ev) => {
          const done = ev.tasks.filter((t) => t.done).length;
          return (
            <Card key={ev.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{ev.title}</CardTitle>
                  {ev.theme ? <p className="mt-1 text-sm text-navy/60">{ev.theme}</p> : null}
                  <p className="mt-2 text-xs text-navy/45">
                    {ev.scheduled_at
                      ? formatDateTime(ev.scheduled_at)
                      : formatDateTime(ev.created_at)}{" "}
                    · {done}/{ev.tasks.length} tarefas
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/ajodun/${ev.id}`}>
                    <Button variant="secondary" size="sm">
                      Abrir
                    </Button>
                  </Link>
                  {ev.sheet_url ? (
                    <a href={ev.sheet_url} target="_blank" rel="noreferrer">
                      <Button variant="gold" size="sm">
                        <ExternalLink className="h-4 w-4" /> Planilha
                      </Button>
                    </a>
                  ) : null}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Remover este ajodun?")) removeAjodunEvent(ev.id);
                      }}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
        {events.length === 0 ? <EmptyState title="Nenhum ajodun cadastrado" /> : null}
      </div>
    </div>
  );
}
