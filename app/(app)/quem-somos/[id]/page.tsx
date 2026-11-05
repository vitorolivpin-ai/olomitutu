"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { BLOG_CATEGORY_LABEL } from "@/lib/house-content";
import { canAccess, canManageHouseContent } from "@/lib/permissions";

export default function QuemSomosPostPage() {
  const params = useParams<{ id: string }>();
  const { state, currentUser, removeBlogPost } = useAppStore();

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  const post = (state.blogPosts ?? []).find((p) => p.id === params.id);
  const canEdit = canManageHouseContent(currentUser?.role);

  if (!post || (!post.published && !canEdit)) {
    return (
      <EmptyState
        title="Post não encontrado"
        action={
          <Link href="/quem-somos">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />
    );
  }

  const paragraphs = post.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <article className="animate-rise mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/quem-somos" className="text-sm text-navy/55 hover:text-navy">
          ← Quem somos
        </Link>
        <Badge tone="gold" className="mt-3">
          {BLOG_CATEGORY_LABEL[post.category]}
        </Badge>
        <h1 className="mt-3 font-display text-4xl leading-tight text-navy">{post.title}</h1>
        <p className="mt-2 text-sm text-navy/55">
          {post.author_name} · {formatDateTime(post.created_at)}
        </p>
      </div>

      <Card className="space-y-4 border-0 bg-white/80 px-5 py-6 sm:px-8">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="text-base leading-relaxed text-navy/80">
            {p}
          </p>
        ))}
      </Card>

      {canEdit ? (
        <Button
          variant="danger"
          onClick={() => {
            if (!confirm("Remover este post?")) return;
            removeBlogPost(post.id);
          }}
        >
          Remover post
        </Button>
      ) : null}
    </article>
  );
}
