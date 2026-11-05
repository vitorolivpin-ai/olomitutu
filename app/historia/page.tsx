"use client";

import { useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { useAppStore } from "@/hooks/use-app-store";
import { BLOG_CATEGORY_LABEL } from "@/lib/house-content";
import { cn } from "@/lib/utils";

/**
 * Quem somos (público): história do Olomi e do Pai de Santo.
 */
export default function HistoriaPage() {
  const { state } = useAppStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const posts = (state.blogPosts ?? [])
    .filter(
      (p) =>
        p.published &&
        (p.category === "historia_casa" || p.category === "historia_pai"),
    )
    .sort((a, b) => {
      const order = (c: string) => (c === "historia_casa" ? 0 : 1);
      const d = order(a.category) - order(b.category);
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
    });

  return (
    <div className="bg-app min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <BrandMark className="h-14 w-14" priority />
          <div>
            <a href="/" className="text-xs text-navy/50 hover:text-navy">
              ← Início
            </a>
            <h1 className="font-display text-2xl text-navy">Quem somos</h1>
            <p className="text-xs text-navy/55">
              História do Olomi e do Pai de Santo
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {posts.map((post) => {
            const open = openId === post.id;
            return (
              <li key={post.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-2xl border border-navy/10 bg-white/80 px-4 py-3 text-left shadow-soft transition",
                    "hover:border-gold/35",
                  )}
                  onClick={() => setOpenId(open ? null : post.id)}
                >
                  <p className="text-[10px] uppercase tracking-wider text-gold-deep">
                    {BLOG_CATEGORY_LABEL[post.category]}
                  </p>
                  <p className="mt-0.5 font-display text-lg text-navy">{post.title}</p>
                  {open ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-navy/70">
                      {post.body}
                    </p>
                  ) : (
                    <p className="mt-1 line-clamp-2 text-xs text-navy/50">
                      {post.excerpt || post.body}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-navy/40">
                    {open ? "Toque para recolher" : "Toque para ler"}
                  </p>
                </button>
              </li>
            );
          })}
          {posts.length === 0 ? (
            <li className="rounded-2xl bg-white/60 px-4 py-8 text-center text-sm text-navy/50">
              Em breve, a história da casa.
            </li>
          ) : null}
        </ul>

        <a
          href="/"
          className="block text-center text-sm text-navy/55 hover:text-navy"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign("/");
          }}
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}
