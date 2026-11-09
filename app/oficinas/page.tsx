"use client";

import { useMemo, useState } from "react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { OficinaCard } from "@/components/oficinas/oficina-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import {
  filterOficinasPublic,
  type OficinaFilterChip,
} from "@/lib/oficinas";
import { cn } from "@/lib/utils";

const CHIPS: Array<{ id: OficinaFilterChip; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "presencial", label: "Presenciais" },
  { id: "online", label: "Online" },
  { id: "em_breve", label: "Em breve" },
];

export default function OficinasPublicPage() {
  const { ready, state } = useAppStore();
  const [chip, setChip] = useState<OficinaFilterChip>("todos");

  const items = useMemo(
    () => filterOficinasPublic(state.oficinas ?? [], chip),
    [state.oficinas, chip],
  );

  return (
    <BrandPageShell>
      <BrandPageHeader
        title="Oficinas"
        subtitle="Aprendizado, prática e troca de saberes da nossa casa."
        backHref="/"
      />

      <div
        className={cn(
          "mt-5 w-full max-w-full overflow-x-auto overflow-y-hidden",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <div className="flex w-max gap-2 pr-1">
          {CHIPS.map((f) => {
            const active = chip === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setChip(f.id)}
                className={cn(
                  "box-border min-h-11 shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition",
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
        {!ready ? (
          <p className="py-10 text-center text-sm text-navy/50">Carregando…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nenhuma oficina disponível no momento. Volte em breve."
            description=""
          />
        ) : (
          items.map((oficina) => (
            <OficinaCard
              key={oficina.id}
              oficina={oficina}
              inscricoes={state.inscricoesOficina ?? []}
            />
          ))
        )}
      </div>
    </BrandPageShell>
  );
}
