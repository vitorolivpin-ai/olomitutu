"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";

export default function LojaLiberacoesPage() {
  const {
    state,
    currentUser,
    releaseShopPurchase,
    rejectShopPurchase,
  } = useAppStore();

  const canManage =
    currentUser?.role === "tesouraria" || currentUser?.role === "administrador";
  const canView =
    canManage ||
    currentUser?.role === "pai_de_santo";

  const rows = useMemo(() => {
    return (state.shopPurchases ?? [])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => {
        const product = (state.shopProducts ?? []).find((x) => x.id === p.product_id);
        const client = (state.clients ?? []).find((c) => c.id === p.client_id);
        return { purchase: p, product, client };
      });
  }, [state.shopPurchases, state.shopProducts, state.clients]);

  const pending = rows.filter((r) => r.purchase.status === "solicitado");

  if (!canView) {
    return <EmptyState title="Acesso restrito ao Financeiro" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <Link href="/loja" className="text-sm text-navy/55 hover:text-navy">
          ← Loja
        </Link>
        <h1 className="mt-2 font-display text-3xl text-navy">Liberações da loja</h1>
        <p className="text-sm text-navy/60">
          Confirme o Pix e libere PDF/curso.{" "}
          {currentUser?.role === "pai_de_santo"
            ? "Só o Financeiro libera após o pagamento."
            : "Você confirma o pagamento e libera o conteúdo."}
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState title="Nenhuma compra aguardando liberação" />
      ) : (
        <div className="grid gap-3">
          {pending.map(({ purchase, product, client }) => (
            <Card key={purchase.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{product?.name ?? "Produto"}</CardTitle>
                  <p className="mt-1 text-sm text-navy/65">
                    {client?.full_name ?? "Cliente"} · R${" "}
                    {(product?.price ?? 0).toFixed(2).replace(".", ",")}
                  </p>
                  <p className="mt-1 text-xs text-navy/45">
                    {formatDateTime(purchase.created_at)}
                  </p>
                  <Badge tone="warning" className="mt-2">
                    Aguardando
                  </Badge>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="gold"
                      onClick={() => releaseShopPurchase(purchase.id)}
                    >
                      Liberar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => rejectShopPurchase(purchase.id)}
                    >
                      Recusar
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {rows.some((r) => r.purchase.status !== "solicitado") ? (
        <div className="space-y-2">
          <h2 className="font-display text-xl text-navy">Histórico</h2>
          {rows
            .filter((r) => r.purchase.status !== "solicitado")
            .map(({ purchase, product, client }) => (
              <Card key={purchase.id}>
                <p className="font-semibold text-navy">
                  {product?.name} · {client?.full_name}
                </p>
                <Badge
                  tone={purchase.status === "pago_liberado" ? "success" : "danger"}
                  className="mt-2"
                >
                  {purchase.status === "pago_liberado" ? "Liberado" : "Recusado"}
                </Badge>
              </Card>
            ))}
        </div>
      ) : null}
    </div>
  );
}
