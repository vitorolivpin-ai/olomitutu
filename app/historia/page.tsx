"use client";

import { useState } from "react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
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
    <BrandPageShell>
      <BrandPageHeader
        title="Quem somos"
        subtitle="História do Olomi e do Pai de Santo"
        backHref="/"
        priority
      />

      <ul className="mt-5 space-y-3">
        {posts.map((post) => {
          const open = openId === post.id;
          return (
            <li key={post.id}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-[18px] bg-white px-4 py-3 text-left shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03] transition",
                  "hover:ring-gold/30",
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
          <li className="rounded-[18px] bg-white px-4 py-8 text-center text-sm text-navy/50 shadow-[0_6px_18px_rgba(11,31,58,0.06)]">
            Em breve, a história da casa.
          </li>
        ) : null}
      </ul>
    </BrandPageShell>
  );
}
