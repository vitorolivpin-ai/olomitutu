"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { EDUCATION_KIND_LABEL } from "@/lib/house-content";
import { canAccess, canManageHouseContent } from "@/lib/permissions";
import type { EducationKind } from "@/types";

export default function EducacaoPage() {
  const { state, currentUser, upsertEducationItem, removeEducationItem } = useAppStore();
  const canEdit = canManageHouseContent(currentUser?.role);
  const [filter, setFilter] = useState<"todos" | EducationKind>("todos");
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<EducationKind>("livro");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");

  const items = useMemo(() => {
    return (state.educationItems ?? [])
      .filter((i) => canEdit || i.published)
      .filter((i) => (filter === "todos" ? true : i.kind === filter))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [state.educationItems, filter, canEdit]);

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = await upsertEducationItem({
      title,
      description,
      kind,
      url,
      author_or_source: source,
      published: true,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setDescription("");
    setUrl("");
    setSource("");
    setWriting(false);
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/conteudo" className="text-sm text-navy/55 hover:text-navy">
            ← Conteúdo da casa
          </Link>
          <h1 className="font-display text-3xl text-navy">Educação</h1>
          <p className="text-sm text-navy/60">
            Livros, vídeos, filmes e podcasts voltados ao candomblé
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => setWriting((v) => !v)}>
            {writing ? "Fechar" : "Adicionar material"}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["todos", "livro", "video", "filme", "podcast"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={
              filter === k
                ? "rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-full bg-white px-3 py-1.5 text-xs font-medium text-navy/70 ring-1 ring-navy/10"
            }
          >
            {k === "todos" ? "Todos" : EDUCATION_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {writing && canEdit ? (
        <Card>
          <CardTitle>Novo material</CardTitle>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onChange={(e) => setKind(e.target.value as EducationKind)}>
                {Object.entries(EDUCATION_KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Link (opcional)</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label>Autor / fonte</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit">Salvar</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone="gold">{EDUCATION_KIND_LABEL[item.kind]}</Badge>
                <CardTitle className="mt-2">{item.title}</CardTitle>
                {item.author_or_source ? (
                  <p className="mt-1 text-xs text-navy/50">{item.author_or_source}</p>
                ) : null}
                {item.description ? (
                  <p className="mt-2 text-sm text-navy/65">{item.description}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">
                      Abrir
                    </Button>
                  </a>
                ) : null}
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Remover?")) void removeEducationItem(item.id);
                    }}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 ? <EmptyState title="Nenhum material nesta categoria" /> : null}
      </div>
    </div>
  );
}
