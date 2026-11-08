"use client";

import { useMemo, useState } from "react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { EmptyState, LoadingBlock } from "@/components/ui/empty-state";
import { WorkshopCard } from "@/components/workshops/workshop-card";
import { useAppStore } from "@/hooks/use-app-store";
import { useWorkshops } from "@/hooks/use-workshops";
import { cn } from "@/lib/utils";
import { publicState, todayYmd } from "@/lib/workshops";
import type { ShopInvoiceForm } from "@/types";

type Filter = "todos" | "presencial" | "online" | "em_breve";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "presencial", label: "Presenciais" },
  { id: "online", label: "Online" },
  { id: "em_breve", label: "Em breve" },
];

/**
 * Oficinas públicas — vêm do cadastro próprio de oficinas (separado da Loja).
 * Os cursos vendidos na Loja aparecem logo abaixo, em “Cursos na loja”.
 */
export default function OficinasPublicPage() {
  const { state, requestShopPurchaseGuest } = useAppStore();
  const { workshops, spotsFor, ready } = useWorkshops();
  const [filter, setFilter] = useState<Filter>("todos");
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyOk, setBuyOk] = useState<string | null>(null);

  const visible = useMemo(() => {
    const today = todayYmd();
    return workshops
      .filter((w) => w.status === "publicada" || w.status === "em_breve")
      .filter((w) => !w.date || w.date >= today)
      .filter((w) => {
        if (filter === "todos") return true;
        if (filter === "em_breve") return publicState(w, spotsFor(w)) === "em_breve";
        return w.modality === filter;
      })
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? "");
      });
  }, [workshops, filter, spotsFor]);

  const courses = useMemo(() => {
    return (state.shopProducts ?? [])
      .filter((p) => p.available && (p.kind ?? "fisico") === "curso")
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }, [state.shopProducts]);

  function onBuyGuest(productId: string, invoice: ShopInvoiceForm) {
    setBuyError(null);
    setBuyOk(null);
    const result = requestShopPurchaseGuest(productId, invoice);
    if (!result.ok) {
      setBuyError(result.error);
      return;
    }
    setBuyOk(
      `Pedido registrado. Faça o Pix e aguarde até 3 dias úteis — o conteúdo e a NF vão para ${invoice.email}.`,
    );
  }

  return (
    <BrandPageShell>
      <BrandPageHeader
        title="Oficinas"
        subtitle="Aprendizado, tradição e conexão com o sagrado."
        backHref="/"
      />

      <div
        className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Filtrar oficinas"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition",
              filter === f.id
                ? "border-navy bg-navy text-white"
                : "border-navy/15 bg-white/70 text-navy/75 hover:bg-white",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {!ready ? (
          <LoadingBlock label="Carregando oficinas…" />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nenhuma oficina por aqui ainda"
            description="Quando a casa abrir novas oficinas, elas aparecem nesta página."
          />
        ) : (
          visible.map((w) => (
            <WorkshopCard key={w.id} workshop={w} spots={spotsFor(w)} href={`/oficinas/${w.id}`} />
          ))
        )}
      </div>

      {courses.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl text-navy">Cursos na loja</h2>
          <p className="mt-1 text-sm text-navy/60">
            Cursos pagos da casa. Ao concluir, o certificado aparece na sua conta.
          </p>
          <div className="mt-3">
            <ShopCatalog
              products={courses}
              houseSettings={state.houseSettings}
              canBuyGuest
              onBuyGuest={onBuyGuest}
              buyError={buyError}
              buyOk={buyOk}
            />
          </div>
        </section>
      ) : null}
    </BrandPageShell>
  );
}
