"use client";

import { useMemo, useState } from "react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import type { ShopInvoiceForm } from "@/types";

/**
 * Oficinas públicas — sem brasão (só Splash e Home).
 * Lista cursos/oficinas disponíveis na loja da casa.
 */
export default function OficinasPublicPage() {
  const { state, requestShopPurchaseGuest } = useAppStore();
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyOk, setBuyOk] = useState<string | null>(null);

  const products = useMemo(() => {
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
        subtitle="Cursos e oficinas da casa."
        backHref="/"
      />

      <div className="mt-5">
        {products.length === 0 ? (
          <EmptyState
            title="Nenhuma oficina publicada ainda"
            description="Quando a casa liberar cursos e oficinas, eles aparecem aqui."
          />
        ) : (
          <ShopCatalog
            products={products}
            houseSettings={state.houseSettings}
            canBuyGuest
            onBuyGuest={onBuyGuest}
            buyError={buyError}
            buyOk={buyOk}
          />
        )}
      </div>
    </BrandPageShell>
  );
}
