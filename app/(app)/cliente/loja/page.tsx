"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";

export default function ClienteLojaPage() {
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

  if (currentUser?.role !== "cliente") {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

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
      <div>
        <Link href="/cliente" className="text-sm text-navy/55 hover:text-navy">
          ← Quem somos
        </Link>
        <p className="mt-2 text-sm font-medium text-gold-deep">Área do cliente</p>
        <h1 className="font-display text-3xl text-navy">Loja da casa</h1>
        <p className="text-sm text-navy/60">
          Com a sua conta, PDF e cursos liberam aqui no app após o Financeiro
          confirmar o Pix.
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto disponível no momento" />
      ) : (
        <ShopCatalog
          products={products}
          houseSettings={state.houseSettings}
          purchases={state.shopPurchases}
          clientId={currentUser.client_id}
          canBuyAccount
          onBuyAccount={onBuyAccount}
          buyError={buyError}
          buyOk={buyOk}
        />
      )}
    </div>
  );
}
