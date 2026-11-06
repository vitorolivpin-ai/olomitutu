"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Music2, Video } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { LibraryPlayer } from "@/components/library/library-player";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { LIBRARY_KIND_LABEL, sortLibrary } from "@/lib/library";
import type { LibraryItem, LibraryKind } from "@/types";

const filters: Array<{ id: "todos" | LibraryKind; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "video", label: "Vídeos" },
  { id: "cantiga", label: "Cantigas" },
  { id: "pdf", label: "PDFs" },
  { id: "outro", label: "Outros" },
];

function KindIcon({ kind }: { kind: LibraryKind }) {
  if (kind === "video") return <Video className="h-5 w-5 text-gold-deep" />;
  if (kind === "cantiga") return <Music2 className="h-5 w-5 text-gold-deep" />;
  return <FileText className="h-5 w-5 text-gold-deep" />;
}

/** Biblioteca pública — sem login, na aba principal. */
export default function AcervoPublicoPage() {
  const { state, refreshCloudChat } = useAppStore();
  const [filter, setFilter] = useState<"todos" | LibraryKind>("todos");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void refreshCloudChat();
  }, [refreshCloudChat]);

  const items = useMemo(() => {
    const list = sortLibrary(state.libraryItems ?? []).filter((i) => i.visible_to_clients);
    if (filter === "todos") return list;
    return list.filter((i) => i.kind === filter);
  }, [state.libraryItems, filter]);

  const openItem: LibraryItem | undefined = items.find((i) => i.id === openId);

  return (
    <div className="min-h-screen bg-app px-4 py-8">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <BrandMark className="mx-auto h-24 w-24" />
          </Link>
          <p className="mt-3 text-sm font-medium text-gold-deep">ILÉ OLÓRÒKÈ ÀṢẸ</p>
          <h1 className="font-display text-3xl text-navy">Biblioteca</h1>
          <p className="mt-1 text-sm text-navy/60">
            Cantigas, vídeos e PDFs — aberto a todos, sem criar conta.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id);
                setOpenId(null);
              }}
              className={
                filter === f.id
                  ? "rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full bg-white px-3 py-1.5 text-xs font-medium text-navy/70 ring-1 ring-navy/10"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {openItem ? (
          <Card>
            <button
              type="button"
              className="text-sm text-navy/55 hover:text-navy"
              onClick={() => setOpenId(null)}
            >
              ← Voltar à lista
            </button>
            <CardTitle className="mt-2">{openItem.title}</CardTitle>
            {openItem.description ? (
              <p className="mt-2 text-sm text-navy/65">{openItem.description}</p>
            ) : null}
            <div className="mt-4">
              <LibraryPlayer item={openItem} />
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <Card key={item.id} className="transition hover:border-gold/40">
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => setOpenId(item.id)}
                >
                  <KindIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{item.title}</CardTitle>
                    <p className="mt-1 line-clamp-2 text-sm text-navy/60">
                      {item.description || LIBRARY_KIND_LABEL[item.kind]}
                    </p>
                    <Badge tone="gold" className="mt-2">
                      {LIBRARY_KIND_LABEL[item.kind]}
                    </Badge>
                  </div>
                </button>
              </Card>
            ))}
            {items.length === 0 ? (
              <EmptyState
                title="Nenhum material público ainda"
                description="A casa publica cantigas e vídeos pela área da Biblioteca."
              />
            ) : null}
          </div>
        )}

        <p className="text-center text-sm">
          <Link href="/" className="text-navy/50 underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
