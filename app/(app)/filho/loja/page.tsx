"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useMemo, useState } from "react";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isFilhoDeSanto } from "@/lib/filho";

export default function FilhoLojaPage() {
  const { state, currentUser, requestShopPurchase } = useAppStore();
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyOk, setBuyOk] = useState<string | null>(null);

  const products = useMemo(
    () =>
      (state.shopProducts ?? [])
        .filter((p) => p.available)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [state.shopProducts],
  );

  if (!currentUser || !isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  const user = currentUser;

  function onBuyAccount(productId: string) {
    setBuyError(null);
    setBuyOk(null);
    const result = requestShopPurchase(productId);
    if (!result.ok) {
      setBuyError(result.error);
      return;
    }
    setBuyOk(
      "Pedido enviado. Após o Pix, o conteúdo é liberado na sua conta (até 3 dias úteis).",
    );
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Loja da casa"
        subtitle="Compre produtos, PDFs e cursos — liberação pelo Financeiro."
        backHref="/filho"
        backLabel="Início"
      />

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto disponível no momento" />
      ) : (
        <ShopCatalog
          products={products}
          houseSettings={state.houseSettings}
          purchases={state.shopPurchases}
          clientId={user.client_id}
          canBuyAccount
          onBuyAccount={onBuyAccount}
          buyError={buyError}
          buyOk={buyOk}
        />
      )}

    </div>
  );
}
