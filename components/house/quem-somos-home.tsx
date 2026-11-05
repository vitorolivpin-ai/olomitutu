"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";
import { BLOG_CATEGORY_LABEL } from "@/lib/house-content";
import { cn } from "@/lib/utils";

export type HomeTrail = {
  id: string;
  label: string;
  hint: string;
  href?: string;
  onClick?: () => void;
  tone?: "navy" | "gold" | "leaf";
};

type Props = {
  eyebrow: string;
  trailsTitle?: string;
  trails: HomeTrail[];
  /** Segunda lista — acessos só para quem tem autorização */
  restrictedTrails?: HomeTrail[];
  restrictedTitle?: string;
  restrictedHint?: string;
  footer?: React.ReactNode;
  /** Quantos posts exibir no painel principal */
  postLimit?: number;
  /**
   * No hub (sem login): abre o texto na própria tela.
   * Dentro do app: navega para /quem-somos/[id].
   */
  publicMode?: boolean;
};

const toneBorder = {
  navy: "border-l-navy",
  gold: "border-l-gold",
  leaf: "border-l-leaf",
};

const toneDot = {
  navy: "bg-navy",
  gold: "bg-gold",
  leaf: "bg-leaf",
};

function TrailList({ trails }: { trails: HomeTrail[] }) {
  return (
    <ol className="relative mt-5 space-y-0">
      <span
        aria-hidden
        className="absolute bottom-3 left-[11px] top-3 w-px bg-gradient-to-b from-gold via-navy/25 to-leaf/50"
      />
      {trails.map((trail, index) => {
        const tone = trail.tone ?? "navy";
        const inner = (
          <div
            className={cn(
              "relative ml-0 flex gap-3 rounded-2xl border border-transparent bg-mist/50 p-3 transition hover:border-gold/30 hover:bg-white",
              `border-l-4 ${toneBorder[tone]}`,
            )}
          >
            <span
              className={cn(
                "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full ring-4 ring-cream",
                toneDot[tone],
              )}
              aria-hidden
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {index + 1}
              </span>
            </span>
            <div className="min-w-0 flex-1 pl-1">
              <p className="font-display text-lg text-navy">{trail.label}</p>
              <p className="text-xs text-navy/55">{trail.hint}</p>
            </div>
          </div>
        );

        if (trail.onClick) {
          return (
            <li key={trail.id} className="pb-3">
              <button type="button" className="w-full text-left" onClick={trail.onClick}>
                {inner}
              </button>
            </li>
          );
        }

        return (
          <li key={trail.id} className="pb-3">
            <Link href={trail.href || "#"} className="block">
              {inner}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Início com Quem Somos (mini-blog) à esquerda e
 * “traços” de entrada à direita — caminhos para onde a pessoa vai.
 */
export function QuemSomosHome({
  eyebrow,
  trailsTitle = "Para onde entrar",
  trails,
  restrictedTrails,
  restrictedTitle = "Acesso restrito",
  restrictedHint = "Só quem tem autorização entra nestas áreas.",
  footer,
  postLimit = 4,
  publicMode = false,
}: Props) {
  const { state, ready } = useAppStore();
  const [openId, setOpenId] = useState<string | null>(null);
  // Só lista posts depois da store hidratar (seed SSR ≠ localStorage)
  const posts = !ready
    ? []
    : (state.blogPosts ?? [])
        .filter((p) => p.published)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, postLimit);

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <BrandMark className="h-20 w-20 sm:h-24 sm:w-24" priority />
        <div>
          <p className="text-sm font-medium text-gold-deep">{eyebrow}</p>
          <h1 className="font-display text-3xl text-navy sm:text-4xl">Quem somos</h1>
          <p className="mt-1 max-w-xl text-sm text-navy/60">
            A história da casa em primeiro plano. Ao lado, os caminhos para entrar
            nas áreas do app.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)]">
        {/* Mini-blog principal */}
        <section className="space-y-4">
          {posts.map((post, idx) => {
            const open = openId === post.id;
            const card = (
              <Card
                className={cn(
                  "transition hover:border-gold/40",
                  idx === 0 && "border-l-4 border-l-gold bg-white",
                )}
              >
                <Badge tone="gold">{BLOG_CATEGORY_LABEL[post.category]}</Badge>
                <CardTitle className={cn("mt-2", idx === 0 ? "text-2xl" : "text-xl")}>
                  {post.title}
                </CardTitle>
                {publicMode && open ? (
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
                    <p className="mt-3 text-xs font-medium text-gold-deep">
                      {publicMode ? "Ler post ↓" : "Ler post →"}
                    </p>
                  </>
                )}
              </Card>
            );

            if (publicMode) {
              return (
                <button
                  key={post.id}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setOpenId(open ? null : post.id)}
                >
                  {card}
                </button>
              );
            }

            return (
              <Link key={post.id} href={`/quem-somos/${post.id}`} className="block">
                {card}
              </Link>
            );
          })}
          {posts.length === 0 ? (
            <Card>
              <CardTitle>Em breve</CardTitle>
              <p className="mt-2 text-sm text-navy/60">
                O Pai de Santo ainda vai publicar a história da casa aqui.
              </p>
            </Card>
          ) : null}
          {!publicMode ? (
            <Link href="/quem-somos">
              <Button variant="secondary" className="w-full sm:w-auto">
                Ver todos os posts
              </Button>
            </Link>
          ) : (
            <p className="text-xs text-navy/50">
              Entre em um dos caminhos ao lado para usar o app completo.
            </p>
          )}
        </section>

        {/* Traços / caminhos de entrada */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
              {trailsTitle}
            </p>
            <p className="mt-1 text-sm text-navy/55">
              Siga o traço até a área que deseja abrir.
            </p>
            <TrailList trails={trails} />
          </Card>

          {restrictedTrails && restrictedTrails.length > 0 ? (
            <Card className="overflow-hidden border-navy/20 bg-navy/[0.03]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/70">
                {restrictedTitle}
              </p>
              <p className="mt-1 text-sm text-navy/55">{restrictedHint}</p>
              <TrailList trails={restrictedTrails} />
            </Card>
          ) : null}

          {footer}
        </aside>
      </div>
    </div>
  );
}
