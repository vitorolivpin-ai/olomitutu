"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { memberForProfile } from "@/lib/ensure-filho-member";
import { isFilhoDeSanto } from "@/lib/filho";
import {
  CHECKLIST_LEVEL_LABEL,
  CHECKLIST_TOPIC_LABEL,
} from "@/lib/house-content";
import type { ChecklistLevel } from "@/types";
import { cn } from "@/lib/utils";

const LEVELS: ChecklistLevel[] = [
  "abian",
  "iniciado",
  "egbomi",
  "ogan_ekeji_oloye_ajoye",
];

export default function FilhoChecklistPage() {
  const { state, currentUser, toggleChecklistProgress } = useAppStore();
  const member = memberForProfile(state.members, currentUser?.id);
  const defaultLevel = member?.checklist_level ?? "abian";
  const [level, setLevel] = useState<ChecklistLevel>(defaultLevel);

  const items = useMemo(
    () =>
      (state.checklistItems ?? [])
        .filter((i) => i.level === level)
        .sort((a, b) => a.sort_order - b.sort_order),
    [state.checklistItems, level],
  );

  const progress = state.checklistProgress ?? [];

  if (!isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  function doneFor(itemId: string) {
    if (!currentUser) return false;
    return Boolean(
      progress.find((p) => p.user_id === currentUser.id && p.item_id === itemId && p.done),
    );
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BrandPageHeader
          title="O que fazer"
          subtitle="Do Abian aos cargos — vestimentas, ebó, igba e orientações da casa."
          backHref="/filho"
          backLabel="Início"
        />
        {member?.checklist_level ? (
          <p className="mt-2 text-center text-xs text-navy/50">
            Seu nível cadastrado: {CHECKLIST_LEVEL_LABEL[member.checklist_level]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => setLevel(lv)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              level === lv
                ? "bg-navy text-white"
                : "bg-navy/5 text-navy/65 hover:bg-navy/10",
            )}
          >
            {CHECKLIST_LEVEL_LABEL[lv]}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {items.map((item) => {
          const done = doneFor(item.id);
          return (
            <Card key={item.id} className={cn(done && "opacity-80")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <Badge tone="gold">{CHECKLIST_TOPIC_LABEL[item.topic]}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-navy/75">
                {item.body}
              </p>
              <button
                type="button"
                className="mt-4 text-sm font-medium text-gold-deep"
                onClick={() => toggleChecklistProgress(item.id)}
              >
                {done ? "Marcar como pendente" : "Marcar como feito"}
              </button>
            </Card>
          );
        })}
        {items.length === 0 ? (
          <EmptyState title="Nenhum item neste nível ainda" />
        ) : null}
      </div>
    </div>
  );
}
