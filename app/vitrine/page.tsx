"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import type { ShopInvoiceForm } from "@/types";

/** Vitrine pública — qualquer pessoa, sem login. */
export default function PublicLojaPage() {
  const { state, requestShopPurchaseGuest } = useAppStore();
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
    <div className="bg-app min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <BrandMark className="mx-auto h-24 w-24" />
          </Link>
          <p className="mt-3 text-sm font-medium text-gold-deep">ILÉ OLÓRÒKÈ ÀṢẸ</p>
          <h1 className="font-display text-3xl text-navy">Loja</h1>
          <p className="mt-1 text-sm text-navy/60">
            Produtos, PDFs e cursos. Sem conta: ficha de NF e envio por e-mail.
          </p>
        </div>

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

        <p className="text-center text-sm text-navy/55">
          Já tem conta?{" "}
          <Link href="/entrar/cliente" className="text-navy underline">
            Entre para liberar o conteúdo no app
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link href="/" className="text-navy/50 underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
