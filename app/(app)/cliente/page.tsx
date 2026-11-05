"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isClientRegistrationComplete } from "@/lib/client-registration";
import { BLOG_CATEGORY_LABEL } from "@/lib/house-content";
import { cn } from "@/lib/utils";

/**
 * App do Cliente: só Quem Somos + caminho para o cadastro.
 * Sem o menu completo da casa.
 */
export default function ClienteHomePage() {
  const { state, currentUser } = useAppStore();
  const [openId, setOpenId] = useState<string | null>(null);

  if (currentUser?.role !== "cliente" || !currentUser.client_id) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  const client = state.clients.find((c) => c.id === currentUser.client_id);
  const registered = isClientRegistrationComplete(client);
  const posts = (state.blogPosts ?? [])
    .filter((p) => p.published)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <BrandMark className="h-20 w-20" priority />
        <div>
          <p className="text-sm font-medium text-gold-deep">App do Cliente</p>
          <h1 className="font-display text-3xl text-navy sm:text-4xl">Quem somos</h1>
          <p className="mt-1 text-sm text-navy/60">
            Conheça a casa. Seu cadastro fica separado, só com seus dados.
          </p>
        </div>
      </div>

      {!registered ? (
        <Card className="border-l-4 border-l-gold">
          <CardTitle>Complete seu cadastro</CardTitle>
          <p className="mt-2 text-sm text-navy/65">
            Nome completo, data de nascimento e telefone — para a casa te conhecer.
          </p>
          <Link href="/cliente/cadastro" className="mt-4 block">
            <Button variant="gold" className="w-full">
              Fazer meu cadastro
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-leaf">
          <p className="text-sm text-navy/70">
            Olá, <strong>{client?.full_name ?? currentUser.full_name}</strong> — cadastro ok.
          </p>
          <Link href="/cliente/cadastro" className="mt-3 inline-block">
            <Button size="sm" variant="secondary">
              Ver / editar cadastro
            </Button>
          </Link>
        </Card>
      )}

      <Card className="border-l-4 border-l-navy">
        <CardTitle>Falar com o Pai de Santo</CardTitle>
        <p className="mt-2 text-sm text-navy/65">
          Mensagens por texto ou áudio — as respostas aparecem no mesmo chat.
        </p>
        <Link href="/cliente/mensagens" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            Abrir conversa
          </Button>
        </Link>
      </Card>

      <section className="space-y-4">
        {posts.map((post, idx) => {
          const open = openId === post.id;
          return (
            <button
              key={post.id}
              type="button"
              className="block w-full text-left"
              onClick={() => setOpenId(open ? null : post.id)}
            >
              <Card
                className={cn(
                  "transition hover:border-gold/40",
                  idx === 0 && "border-l-4 border-l-gold",
                )}
              >
                <Badge tone="gold">{BLOG_CATEGORY_LABEL[post.category]}</Badge>
                <CardTitle className={cn("mt-2", idx === 0 ? "text-2xl" : "text-xl")}>
                  {post.title}
                </CardTitle>
                {open ? (
                  <div className="mt-3 space-y-3">
                    {post.body
                      .split(/\n\s*\n/)
                      .map((p) => p.trim())
                      .filter(Boolean)
                      .map((p, i) => (
                        <p key={i} className="text-sm leading-relaxed text-navy/75">
                          {p}
                        </p>
                      ))}
                    <p className="text-xs font-medium text-gold-deep">Toque para recolher</p>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-navy/70">
                      {post.excerpt || post.body}
                    </p>
                    <p className="mt-3 text-xs font-medium text-gold-deep">Ler post ↓</p>
                  </>
                )}
              </Card>
            </button>
          );
        })}
        {posts.length === 0 ? (
          <EmptyState title="Ainda sem posts" description="A casa publicará a história em breve." />
        ) : null}
      </section>

      <Link href="/">
        <Button variant="ghost" className="w-full">
          Menu principal
        </Button>
      </Link>
    </div>
  );
}
