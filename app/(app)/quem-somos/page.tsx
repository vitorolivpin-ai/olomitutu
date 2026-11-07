"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { BLOG_CATEGORY_LABEL } from "@/lib/house-content";
import { canAccess, canManageHouseContent } from "@/lib/permissions";
import type { BlogPostCategory } from "@/types";

export default function QuemSomosPage() {
  const { state, currentUser, upsertBlogPost, removeBlogPost } = useAppStore();
  const canEdit = canManageHouseContent(currentUser?.role);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<BlogPostCategory>("historia_casa");
  const [error, setError] = useState("");

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  const posts = (state.blogPosts ?? [])
    .filter((p) => canEdit || p.published)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = await upsertBlogPost({
      title,
      excerpt,
      body,
      category,
      published: true,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setExcerpt("");
    setBody("");
    setWriting(false);
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Quem somos"
        subtitle="Mini-blog da casa — história, pessoas e memórias"
        backHref="/conteudo"
        backLabel="Conteúdo da casa"
      />
      <div className="flex flex-wrap justify-center gap-3 empty:hidden">
        {canEdit ? (
          <Button variant={writing ? "secondary" : "primary"} onClick={() => setWriting((v) => !v)}>
            {writing ? "Fechar editor" : "Novo post"}
          </Button>
        ) : null}
      </div>

      {writing && canEdit ? (
        <Card>
          <CardTitle>Escrever post</CardTitle>
          <form onSubmit={onPublish} className="mt-4 space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as BlogPostCategory)}
              >
                {Object.entries(BLOG_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Resumo (aparece na lista)</Label>
              <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>
            <div>
              <Label>Texto completo</Label>
              <Textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Conte a história… Use parágrafos separados por linha em branco."
                required
              />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit">Publicar</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="transition hover:border-gold/30">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Badge tone="gold">{BLOG_CATEGORY_LABEL[post.category]}</Badge>
              <p className="text-xs text-navy/45">{formatDateTime(post.created_at)}</p>
            </div>
            <Link href={`/quem-somos/${post.id}`}>
              <CardTitle className="mt-2 hover:text-gold-deep">{post.title}</CardTitle>
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-navy/70">
              {post.excerpt || post.body}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={`/quem-somos/${post.id}`}>
                <Button size="sm" variant="secondary">
                  Ler post
                </Button>
              </Link>
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Remover este post?")) void removeBlogPost(post.id);
                  }}
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
        {posts.length === 0 ? (
          <EmptyState title="Ainda sem posts" description="Publique a primeira história da casa." />
        ) : null}
      </div>
    </div>
  );
}
