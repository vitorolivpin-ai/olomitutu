"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LibraryPlayer } from "@/components/library/library-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { LIBRARY_KIND_LABEL } from "@/lib/library";
import { canAccess, canManageLibrary } from "@/lib/permissions";

export default function BibliotecaItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, currentUser, removeLibraryItem } = useAppStore();

  if (!canAccess(currentUser?.role, "library")) {
    return <EmptyState title="Acesso negado" />;
  }

  const item = (state.libraryItems ?? []).find((i) => i.id === params.id);
  if (!item) {
    return (
      <EmptyState
        title="Material não encontrado"
        action={
          <Link href="/biblioteca">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />
    );
  }

  const canManage = canManageLibrary(currentUser?.role);

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BrandPageHeader
          title={item.title}
          backHref="/biblioteca"
          backLabel="Biblioteca"
        />
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge tone="gold">{LIBRARY_KIND_LABEL[item.kind]}</Badge>
          {item.visible_to_clients ? (
            <Badge tone="success">Visível ao cliente</Badge>
          ) : (
            <Badge tone="muted">Só a casa</Badge>
          )}
        </div>
        {item.description ? (
          <p className="mt-3 text-sm text-navy/65">{item.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-navy/45">
          {item.uploaded_by_name} · {formatDateTime(item.created_at)}
        </p>
      </div>

      <Card>
        <CardTitle>Conteúdo</CardTitle>
        <div className="mt-4">
          <LibraryPlayer item={item} />
        </div>
      </Card>

      {canManage ? (
        <Button
          variant="danger"
          onClick={() => {
            if (!confirm(`Remover “${item.title}”?`)) return;
            void removeLibraryItem(item.id).then(() => router.replace("/biblioteca"));
          }}
        >
          Remover material
        </Button>
      ) : null}
    </div>
  );
}
