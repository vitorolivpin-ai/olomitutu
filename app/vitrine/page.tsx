"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { cn } from "@/lib/utils";
import type { ShopInvoiceForm, ShopProductKind } from "@/types";

const filters: Array<{ id: "todos" | ShopProductKind; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "fisico", label: "Produtos" },
  { id: "curso", label: "Cursos" },
  { id: "pdf", label: "PDFs" },
];

export default function PublicLojaPage() {
  const { state, requestShopPurchaseGuest } = useAppStore();
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyOk, setBuyOk] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | ShopProductKind>("todos");

  const products = useMemo(() => {
    return (state.shopProducts ?? [])
      .filter((p) => p.available)
      .filter((p) => (filter === "todos" ? true : (p.kind ?? "fisico") === filter))
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }, [state.shopProducts, filter]);

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
        title="Loja"
        subtitle="Produtos, materiais e cursos da casa."
        backHref="/"
        priority
      />

      <div className="-mx-1 mt-5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition",
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

      <div className="mt-4">
        {products.length === 0 ? (
          <EmptyState title="Nenhum produto disponível no momento" />
        ) : (
          <ShopCatalog
            products={products}
            houseSettings={state.houseSettings}
            purchases={state.shopPurchases}
            canBuyGuest
            onBuyGuest={onBuyGuest}
            buyError={buyError}
            buyOk={buyOk}
          />
        )}
      </div>

      <p className="mt-5 text-center text-sm text-navy/55">
        Já tem conta?{" "}
        <Link href="/entrar/cliente" className="font-medium text-navy underline">
          Entre para liberar o conteúdo no app
        </Link>
      </p>
    </BrandPageShell>
  );
}
