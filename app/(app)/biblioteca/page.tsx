"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Music2, Plus, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { LIBRARY_KIND_LABEL, sortLibrary } from "@/lib/library";
import { canAccess, canManageLibrary } from "@/lib/permissions";
import type { LibraryKind } from "@/types";

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

export default function BibliotecaPage() {
  const { state, currentUser, removeLibraryItem } = useAppStore();
  const [filter, setFilter] = useState<"todos" | LibraryKind>("todos");
  const canManage = canManageLibrary(currentUser?.role);

  const items = useMemo(() => {
    const list = sortLibrary(state.libraryItems ?? []);
    if (filter === "todos") return list;
    return list.filter((i) => i.kind === filter);
  }, [state.libraryItems, filter]);

  if (!canAccess(currentUser?.role, "library")) {
    return <EmptyState title="Biblioteca indisponível para este perfil" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Biblioteca"
        subtitle={`Vídeos, cantigas e PDFs da casa${canManage ? " · você pode publicar" : ""}`}
      />
      <div className="flex flex-wrap justify-center gap-3 empty:hidden">
        {canManage ? (
          <Link href="/biblioteca/novo">
            <Button>
              <Plus className="h-4 w-4" /> Novo material
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
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

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 gap-3">
                <KindIcon kind={item.kind} />
                <div className="min-w-0">
                  <CardTitle className="truncate">{item.title}</CardTitle>
                  <p className="mt-1 line-clamp-2 text-sm text-navy/60">
                    {item.description || LIBRARY_KIND_LABEL[item.kind]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="gold">{LIBRARY_KIND_LABEL[item.kind]}</Badge>
                    {item.visible_to_clients ? (
                      <Badge tone="success">Visível ao cliente</Badge>
                    ) : (
                      <Badge tone="muted">Só a casa</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-navy/45">
                    {item.uploaded_by_name} · {formatDateTime(item.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/biblioteca/${item.id}`}>
                  <Button variant="secondary" size="md">
                    Abrir
                  </Button>
                </Link>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      if (confirm(`Remover “${item.title}”?`)) removeLibraryItem(item.id);
                    }}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 ? (
          <EmptyState
            title="Nenhum material nesta categoria"
            description={
              canManage
                ? "Publique o primeiro vídeo, cantiga ou PDF."
                : "Aguarde a casa publicar conteúdos."
            }
            action={
              canManage ? (
                <Link href="/biblioteca/novo">
                  <Button>Novo material</Button>
                </Link>
              ) : undefined
            }
          />
        ) : null}
      </div>
    </div>
  );
}
