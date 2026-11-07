"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Music2,
  Search,
  Video,
} from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { LibraryPlayer } from "@/components/library/library-player";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { LIBRARY_KIND_LABEL, sortLibrary } from "@/lib/library";
import { cn } from "@/lib/utils";
import type { LibraryItem, LibraryKind } from "@/types";

const filters: Array<{ id: "todos" | LibraryKind; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "video", label: "Vídeos" },
  { id: "cantiga", label: "Cantigas" },
  { id: "pdf", label: "PDFs" },
  { id: "outro", label: "Outros" },
];

function KindIcon({ kind }: { kind: LibraryKind }) {
  if (kind === "video") return <Video className="h-5 w-5 text-navy" strokeWidth={1.85} />;
  if (kind === "cantiga") return <Music2 className="h-5 w-5 text-navy" strokeWidth={1.85} />;
  return <FileText className="h-5 w-5 text-navy" strokeWidth={1.85} />;
}

function actionLabel(kind: LibraryKind) {
  if (kind === "video") return "Assistir";
  if (kind === "cantiga") return "Ouvir";
  if (kind === "pdf") return "Abrir";
  return "Abrir";
}

export default function AcervoPublicoPage() {
  const { state, refreshCloudChat } = useAppStore();
  const [filter, setFilter] = useState<"todos" | LibraryKind>("todos");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void refreshCloudChat();
  }, [refreshCloudChat]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortLibrary(state.libraryItems ?? [])
      .filter((i) => i.visible_to_clients)
      .filter((i) => (filter === "todos" ? true : i.kind === filter))
      .filter((i) => {
        if (!q) return true;
        const hay = `${i.title} ${i.description ?? ""} ${LIBRARY_KIND_LABEL[i.kind]}`.toLowerCase();
        return hay.includes(q);
      });
  }, [state.libraryItems, filter, query]);

  const openItem: LibraryItem | undefined = items.find((i) => i.id === openId);

  return (
    <BrandPageShell
      watermarkVariant="biblioteca"
      className="overflow-x-hidden"
      mainClassName="overflow-x-hidden px-4 sm:px-6"
    >
      <BrandPageHeader
        title="Biblioteca"
        subtitle="Cantigas, vídeos e materiais da casa."
        backHref="/"
        priority
      />

      {!openItem ? (
        <div className="mt-5 box-border w-full max-w-full overflow-x-hidden">
          <label className="relative block w-full max-w-full">
            <span className="sr-only">Buscar na biblioteca</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenId(null);
              }}
              placeholder="Buscar na biblioteca..."
              className="box-border w-full max-w-full rounded-full border-0 bg-white py-3.5 pl-11 pr-4 text-sm text-navy shadow-[0_6px_18px_rgba(11,31,58,0.06)] outline-none ring-1 ring-navy/[0.04] placeholder:text-navy/35 focus:ring-2 focus:ring-gold/40"
            />
          </label>

          {/* Chips: scroll horizontal, sem barra visível, sem quebrar a página */}
          <div
            className={cn(
              "mt-4 w-full max-w-full overflow-x-auto overflow-y-hidden",
              "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            )}
          >
            <div className="flex w-max gap-2 pr-1">
              {filters.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFilter(f.id);
                      setOpenId(null);
                    }}
                    className={cn(
                      "box-border shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition",
                      active
                        ? "bg-navy text-white shadow-soft"
                        : "bg-white text-navy ring-1 ring-navy/10",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid w-full max-w-full gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenId(item.id)}
                className={cn(
                  "box-border flex w-full max-w-full items-center gap-3",
                  "rounded-[18px] bg-white px-3.5 py-3.5 text-left",
                  "shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03]",
                  "transition active:scale-[0.99]",
                )}
              >
                {/* 1) Ícone — tamanho fixo, não encolhe */}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#efe6d0]">
                  <KindIcon kind={item.kind} />
                </span>

                {/* 2+3) Texto + botão — em <380px o botão desce / vira seta */}
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3",
                    "max-[379px]:flex-col max-[379px]:items-stretch",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-navy">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-navy/45">
                      {item.description
                        ? `${LIBRARY_KIND_LABEL[item.kind]} · ${item.description}`
                        : LIBRARY_KIND_LABEL[item.kind]}
                    </p>
                  </div>

                  {/* Botão Abrir — não encolhe; ≥44px de toque; em telas estreitas = seta */}
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center justify-center",
                      "min-h-11 min-w-11",
                      "max-[379px]:self-end",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "hidden min-[380px]:inline-flex",
                        "min-h-11 items-center rounded-full bg-[#e8d5a3] px-3.5 text-[11px] font-semibold text-navy",
                      )}
                    >
                      {actionLabel(item.kind)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#e8d5a3] text-navy",
                        "min-[380px]:hidden",
                      )}
                    >
                      <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                  </span>
                </div>
              </button>
            ))}
            {items.length === 0 ? (
              <EmptyState
                title={
                  query.trim()
                    ? "Nenhum material encontrado"
                    : "Nenhum material público ainda"
                }
                description={
                  query.trim()
                    ? "Tente outro termo ou limpe a busca."
                    : "A casa publica cantigas e vídeos pela área da Biblioteca."
                }
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-5 box-border w-full max-w-full rounded-[18px] bg-white p-4 shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03]">
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-navy/55 hover:text-navy"
            onClick={() => setOpenId(null)}
          >
            ← Voltar à lista
          </button>
          <h2 className="mt-3 break-words font-display text-2xl text-navy">{openItem.title}</h2>
          {openItem.description ? (
            <p className="mt-2 break-words text-sm text-navy/65">{openItem.description}</p>
          ) : null}
          <span className="mt-3 inline-flex rounded-full bg-[#efe6d0] px-2.5 py-0.5 text-[10px] font-semibold text-navy">
            {LIBRARY_KIND_LABEL[openItem.kind]}
          </span>
          <div className="mt-4 max-w-full overflow-x-hidden">
            <LibraryPlayer item={openItem} />
          </div>
        </div>
      )}
    </BrandPageShell>
  );
}
