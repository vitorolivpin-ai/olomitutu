"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import {
  CHECKLIST_LEVEL_LABEL,
  CHECKLIST_TOPIC_LABEL,
} from "@/lib/house-content";
import { canAccess, canManageHouseContent } from "@/lib/permissions";
import type { ChecklistLevel, ChecklistTopic } from "@/types";
import { cn } from "@/lib/utils";

const LEVELS: ChecklistLevel[] = [
  "abian",
  "iniciado",
  "egbomi",
  "ogan_ekeji_oloye_ajoye",
];

export default function ChecklistPage() {
  const {
    state,
    currentUser,
    upsertChecklistItem,
    removeChecklistItem,
    toggleChecklistProgress,
  } = useAppStore();
  const canEdit = canManageHouseContent(currentUser?.role);
  const [level, setLevel] = useState<ChecklistLevel>("abian");
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<ChecklistTopic>("geral");
  const [error, setError] = useState("");

  const items = useMemo(
    () =>
      (state.checklistItems ?? [])
        .filter((i) => i.level === level)
        .sort((a, b) => a.sort_order - b.sort_order),
    [state.checklistItems, level],
  );

  const progress = state.checklistProgress ?? [];

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  function doneFor(itemId: string) {
    if (!currentUser) return false;
    return Boolean(
      progress.find((p) => p.user_id === currentUser.id && p.item_id === itemId && p.done),
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = upsertChecklistItem({
      level,
      topic,
      title,
      body,
      sort_order: items.length + 1,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setBody("");
    setWriting(false);
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Checklist de chegada"
        subtitle="O que saber em cada nível — vestimentas, ebó, igba e mais (editável)"
        backHref="/conteudo"
        backLabel="Conteúdo da casa"
      />
      <div className="flex flex-wrap justify-center gap-3 empty:hidden">
        {canEdit ? (
          <Button onClick={() => setWriting((v) => !v)}>
            {writing ? "Fechar" : "Novo item"}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => setLevel(lv)}
            className={
              level === lv
                ? "rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-full bg-white px-3 py-1.5 text-xs font-medium text-navy/70 ring-1 ring-navy/10"
            }
          >
            {CHECKLIST_LEVEL_LABEL[lv]}
          </button>
        ))}
      </div>

      {writing && canEdit ? (
        <Card>
          <CardTitle>Novo item · {CHECKLIST_LEVEL_LABEL[level]}</CardTitle>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <Label>Tema</Label>
              <Select value={topic} onChange={(e) => setTopic(e.target.value as ChecklistTopic)}>
                {Object.entries(CHECKLIST_TOPIC_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Orientação (editável)</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit">Salvar item</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => {
          const done = doneFor(item.id);
          return (
            <Card
              key={item.id}
              className={cn(done && "border-l-4 border-l-success")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone="muted">{CHECKLIST_TOPIC_LABEL[item.topic]}</Badge>
                  <CardTitle className="mt-2">{item.title}</CardTitle>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy/70">
                    {item.body}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {currentUser ? (
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "gold"}
                      onClick={() => toggleChecklistProgress(item.id)}
                    >
                      {done ? "Feito" : "Marcar como feito"}
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Remover item?")) removeChecklistItem(item.id);
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
        {items.length === 0 ? (
          <EmptyState title="Nenhum item neste nível" description="Cadastre orientações editáveis." />
        ) : null}
      </div>
    </div>
  );
}
