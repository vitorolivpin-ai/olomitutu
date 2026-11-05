"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { CONTENT_SECTIONS } from "@/lib/house-content";
import { canAccess, canManageHouseContent } from "@/lib/permissions";

export default function ConteudoHubPage() {
  const { currentUser } = useAppStore();

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Conteúdo da casa indisponível para este perfil" />;
  }

  const canEdit = canManageHouseContent(currentUser?.role);

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Conteúdo da casa</h1>
        <p className="text-sm text-navy/60">
          Quem somos, educação, hierarquia, checklist, ajodun e fotos
          {canEdit ? " · você pode editar" : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CONTENT_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition hover:border-gold/40">
              <CardTitle>{section.title}</CardTitle>
              <p className="mt-2 text-sm text-navy/60">{section.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
