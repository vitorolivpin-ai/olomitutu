"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Music2, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LibraryPlayer } from "@/components/library/library-player";
import { useAppStore } from "@/hooks/use-app-store";
import { LIBRARY_KIND_LABEL, sortLibrary } from "@/lib/library";
import type { LibraryItem, LibraryKind } from "@/types";

function KindIcon({ kind }: { kind: LibraryKind }) {
  if (kind === "video") return <Video className="h-5 w-5 text-gold-deep" />;
  if (kind === "cantiga") return <Music2 className="h-5 w-5 text-gold-deep" />;
  return <FileText className="h-5 w-5 text-gold-deep" />;
}

export default function ClienteBibliotecaPage() {
  const { state, currentUser } = useAppStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      sortLibrary(state.libraryItems ?? []).filter((i) => i.visible_to_clients),
    [state.libraryItems],
  );

  const openItem: LibraryItem | undefined = items.find((i) => i.id === openId);

  if (currentUser?.role !== "cliente") {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <p className="text-sm font-medium text-gold-deep">Área do cliente</p>
        <h1 className="font-display text-3xl text-navy">Biblioteca</h1>
        <p className="text-sm text-navy/60">
          Cantigas, vídeos e PDFs publicados pela casa
        </p>
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
            <Card key={item.id} className="cursor-pointer transition hover:border-gold/40">
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
              title="Ainda sem materiais"
              description="Quando a casa publicar cantigas ou PDFs, eles aparecem aqui."
            />
          ) : null}
        </div>
      )}

      <Link href="/cliente">
        <Button variant="secondary" className="w-full">
          Voltar ao início
        </Button>
      </Link>
    </div>
  );
}
