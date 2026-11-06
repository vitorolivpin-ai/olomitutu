"use client";

import { useEffect, useMemo } from "react";
import { BookOpen, Clapperboard, Headphones, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { EDUCATION_KIND_LABEL } from "@/lib/house-content";
import type { EducationKind } from "@/types";

function KindIcon({ kind }: { kind: EducationKind }) {
  if (kind === "video") return <Video className="h-5 w-5 text-gold-deep" />;
  if (kind === "filme") return <Clapperboard className="h-5 w-5 text-gold-deep" />;
  if (kind === "podcast") return <Headphones className="h-5 w-5 text-gold-deep" />;
  return <BookOpen className="h-5 w-5 text-gold-deep" />;
}

export default function ClienteEducacaoPage() {
  const { state, currentUser, refreshCloudChat } = useAppStore();

  useEffect(() => {
    void refreshCloudChat();
  }, [refreshCloudChat]);

  const items = useMemo(
    () =>
      (state.educationItems ?? [])
        .filter((i) => i.published)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [state.educationItems],
  );

  if (currentUser?.role !== "cliente") {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <p className="text-sm font-medium text-gold-deep">App do Cliente</p>
        <h1 className="font-display text-3xl text-navy">Educação</h1>
        <p className="text-sm text-navy/60">
          Livros, vídeos e materiais publicados pela casa.
        </p>
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start gap-3">
              <KindIcon kind={item.kind} />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <Badge tone="gold" className="mt-1">
                  {EDUCATION_KIND_LABEL[item.kind]}
                </Badge>
                {item.description ? (
                  <p className="mt-2 text-sm text-navy/65">{item.description}</p>
                ) : null}
                {item.author_or_source ? (
                  <p className="mt-1 text-xs text-navy/45">{item.author_or_source}</p>
                ) : null}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-gold-deep underline"
                  >
                    Abrir material
                  </a>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 ? (
          <EmptyState
            title="Nenhum material ainda"
            description="Quando o Pai publicar em Educação, aparece aqui."
          />
        ) : null}
      </div>
    </div>
  );
}
