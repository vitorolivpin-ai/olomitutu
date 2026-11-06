"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Music2,
  Search,
  Video,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { PublicBottomNav } from "@/components/hub/public-bottom-nav";
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
  if (kind === "video") return "Assistir →";
  if (kind === "cantiga") return "Ouvir →";
  if (kind === "pdf") return "Abrir PDF →";
  return "Abrir →";
}

/** Biblioteca pública — layout alinhado à Home / mockup. */
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
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#f3f4f6]">
      <BrandWatermarks variant="biblioteca" />

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-28 pt-5 sm:px-6">
        <div className="relative mb-1 flex items-center justify-center">
          <Link
            href="/"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-[0_4px_14px_rgba(11,31,58,0.08)] ring-1 ring-navy/[0.04]"
            aria-label="Voltar ao início"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
          <BrandMark className="h-[4.75rem] w-[4.75rem]" priority blendOnLight />
        </div>

        <header className="mt-3 text-center">
          <h1 className="font-display text-[2rem] font-semibold leading-none text-navy">
            Biblioteca
          </h1>
          <p className="mt-2 text-sm text-navy/55">
            Cantigas, vídeos e materiais da casa.
          </p>
        </header>

        {!openItem ? (
          <>
            <label className="relative mt-5 block">
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
                className="w-full rounded-full border-0 bg-white py-3.5 pl-11 pr-4 text-sm text-navy shadow-[0_6px_18px_rgba(11,31,58,0.06)] outline-none ring-1 ring-navy/[0.04] placeholder:text-navy/35 focus:ring-2 focus:ring-gold/40"
              />
            </label>

            <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2">
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
                        "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition",
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

            <div className="mt-4 grid gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-white px-3.5 py-3.5 text-left shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03] transition active:scale-[0.99]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#efe6d0]">
                    <KindIcon kind={item.kind} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-navy">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-navy/45">
                      {item.description
                        ? `${LIBRARY_KIND_LABEL[item.kind]} · ${item.description}`
                        : LIBRARY_KIND_LABEL[item.kind]}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-[#efe6d0] px-2.5 py-0.5 text-[10px] font-semibold text-navy">
                      {LIBRARY_KIND_LABEL[item.kind]}
                    </span>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-2">
                    <span className="rounded-full bg-[#e8d5a3] px-3 py-1.5 text-[11px] font-semibold text-navy">
                      {actionLabel(item.kind)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-navy/30" strokeWidth={2} />
                  </span>
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
          </>
        ) : (
          <div className="mt-5 rounded-[18px] bg-white p-4 shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03]">
            <button
              type="button"
              className="text-sm font-medium text-navy/55 hover:text-navy"
              onClick={() => setOpenId(null)}
            >
              ← Voltar à lista
            </button>
            <h2 className="mt-3 font-display text-2xl text-navy">{openItem.title}</h2>
            {openItem.description ? (
              <p className="mt-2 text-sm text-navy/65">{openItem.description}</p>
            ) : null}
            <span className="mt-3 inline-flex rounded-full bg-[#efe6d0] px-2.5 py-0.5 text-[10px] font-semibold text-navy">
              {LIBRARY_KIND_LABEL[openItem.kind]}
            </span>
            <div className="mt-4">
              <LibraryPlayer item={openItem} />
            </div>
          </div>
        )}
      </main>

      <PublicBottomNav />
    </div>
  );
}
