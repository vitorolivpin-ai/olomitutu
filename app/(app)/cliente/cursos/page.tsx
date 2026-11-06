"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isClienteDeJogo, isFilhoDeSanto } from "@/lib/filho";

export default function ClienteCursosPage() {
  const { state, currentUser, requestShopPurchase } = useAppStore();
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyOk, setBuyOk] = useState<string | null>(null);

  const allowed =
    !!currentUser &&
    currentUser.role === "cliente" &&
    !isFilhoDeSanto(currentUser) &&
    isClienteDeJogo(currentUser);

  const clientId = currentUser?.client_id;
  const products = useMemo(
    () =>
      (state.shopProducts ?? [])
        .filter((p) => p.available)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [state.shopProducts],
  );

  const unlocked = (state.shopPurchases ?? []).filter(
    (p) => p.client_id === clientId && p.status === "pago_liberado",
  );

  if (!allowed || !clientId) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  function onBuy(productId: string) {
    setBuyError(null);
    setBuyOk(null);
    const result = requestShopPurchase(productId);
    if (!result.ok) {
      setBuyError(result.error);
      return;
    }
    setBuyOk(
      "Pedido enviado. Após o Pix, o Financeiro libera o curso nesta conta (até 3 dias úteis).",
    );
  }

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-5">
      <div className="flex items-start gap-4">
        <BrandMark className="h-14 w-14 shrink-0" />
        <div>
          <Link href="/cliente" className="text-sm text-navy/55 hover:text-navy">
            ← Início
          </Link>
          <p className="mt-1 text-sm font-medium text-gold-deep">App do Cliente</p>
          <h1 className="font-display text-3xl text-navy">Meus cursos</h1>
          <p className="text-sm text-navy/60">
            Conteúdos liberados na conta e novos pedidos na loja.
          </p>
        </div>
      </div>

      <Card className="border-l-4 border-l-gold">
        <CardTitle>Liberados para você</CardTitle>
        {unlocked.length === 0 ? (
          <p className="mt-2 text-sm text-navy/60">
            Nenhum curso liberado ainda. Compre abaixo e aguarde a confirmação do Pix.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {unlocked.map((purchase) => {
              const product = products.find((p) => p.id === purchase.product_id);
              if (!product) return null;
              return (
                <li
                  key={purchase.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist/60 px-3 py-2"
                >
                  <span className="font-medium text-navy">{product.name}</span>
                  {product.file_url ? (
                    <a
                      href={product.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-gold-deep underline"
                    >
                      Abrir
                    </a>
                  ) : (
                    <span className="text-xs text-navy/45">Aguardando link</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div>
        <h2 className="font-display text-xl text-navy">Loja — comprar e liberar na conta</h2>
        <p className="mt-1 text-sm text-navy/55">
          Sem conta, a loja pública envia por e-mail. Com conta, o conteúdo fica aqui.
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto disponível no momento" />
      ) : (
        <ShopCatalog
          products={products}
          houseSettings={state.houseSettings}
          purchases={state.shopPurchases}
          clientId={clientId}
          canBuyAccount
          onBuyAccount={onBuy}
          buyError={buyError}
          buyOk={buyOk}
        />
      )}
    </div>
  );
}
