"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useMemo } from "react";
import { OrganogramNode } from "@/components/house/organogram-node";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isFilhoDeSanto } from "@/lib/filho";

export default function FilhoHierarquiaPage() {
  const { state, currentUser } = useAppStore();

  const people = useMemo(
    () =>
      (state.hierarchyPeople ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [state.hierarchyPeople],
  );
  const roots = people.filter((p) => !p.parent_id);

  if (!isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Hierarquia"
        subtitle="Organograma do barracão — a cor do anel indica o cargo."
        backHref="/filho"
        backLabel="Início"
      />

      {roots.length === 0 ? (
        <EmptyState title="Hierarquia ainda não publicada" />
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-[640px] flex-wrap justify-center gap-10 py-4">
            {roots.map((root) => (
              <OrganogramNode
                key={root.id}
                person={root}
                childrenPeople={people.filter((p) => p.parent_id === root.id)}
                all={people}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
