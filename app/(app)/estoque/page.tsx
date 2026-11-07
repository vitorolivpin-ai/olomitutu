"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { PackageMinus, PackagePlus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDate } from "@/lib/format";
import { canAccess } from "@/lib/permissions";
import { daysUntilExpiry, lotStatus, productTotalQty } from "@/lib/stock";

export default function EstoquePage() {
  const { state, currentUser } = useAppStore();

  if (!canAccess(currentUser?.role, "stock")) {
    return <EmptyState title="Acesso restrito ao estoque" />;
  }

  const products = state.stockProducts ?? [];
  const lots = state.stockLots ?? [];
  const movements = (state.stockMovements ?? []).slice(0, 8);

  const rows = products
    .map((p) => {
      const productLots = lots
        .filter((l) => l.product_id === p.id && l.quantity > 0)
        .sort((a, b) => a.expires_at.localeCompare(b.expires_at));
      const total = productTotalQty(p.id, lots);
      const nearest = productLots[0];
      const status = nearest ? lotStatus(nearest.expires_at, nearest.quantity) : "zerado";
      return { product: p, total, nearest, status, productLots };
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name));

  const alerts = lots.filter((l) => {
    if (l.quantity <= 0) return false;
    const s = lotStatus(l.expires_at, l.quantity);
    return s === "vencido" || s === "proximo";
  });

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Estoque"
        subtitle="Entrada e baixa por código de barras · validade por lote"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/estoque/entrada">
          <Card className="h-full transition hover:border-gold/40">
            <PackagePlus className="h-7 w-7 text-leaf" />
            <CardTitle className="mt-3">Entrada</CardTitle>
            <p className="mt-1 text-sm text-navy/60">Ler código, validade e quantidade</p>
          </Card>
        </Link>
        <Link href="/estoque/saida">
          <Card className="h-full transition hover:border-gold/40">
            <PackageMinus className="h-7 w-7 text-danger" />
            <CardTitle className="mt-3">Saída / baixa</CardTitle>
            <p className="mt-1 text-sm text-navy/60">Ler código para retirar do estoque</p>
          </Card>
        </Link>
      </div>

      {alerts.length > 0 ? (
        <Card className="border-l-4 border-l-warning">
          <CardTitle>Atenção à validade</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts.slice(0, 5).map((lot) => {
              const product = products.find((p) => p.id === lot.product_id);
              const status = lotStatus(lot.expires_at, lot.quantity);
              return (
                <li key={lot.id} className="flex justify-between gap-2">
                  <span>
                    {product?.name} · {lot.quantity} {product?.unit}
                  </span>
                  <Badge tone={status === "vencido" ? "danger" : "warning"}>
                    {status === "vencido"
                      ? "VENCIDO"
                      : `${daysUntilExpiry(lot.expires_at)} dias`}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {rows.map(({ product, total, nearest, status }) => (
          <Card key={product.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl text-navy">{product.name}</p>
                <p className="text-sm text-navy/60">
                  <ScanLine className="mr-1 inline h-3.5 w-3.5" />
                  {product.barcode}
                  {product.category ? ` · ${product.category}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl text-navy">
                  {total} <span className="text-base">{product.unit}</span>
                </p>
                {nearest ? (
                  <Badge
                    tone={
                      status === "vencido"
                        ? "danger"
                        : status === "proximo"
                          ? "warning"
                          : "success"
                    }
                  >
                    val. {formatDate(nearest.expires_at)}
                  </Badge>
                ) : (
                  <Badge tone="muted">SEM SALDO</Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 ? (
          <EmptyState
            title="Estoque vazio"
            description="Faça a primeira entrada lendo um código de barras."
            action={
              <Link href="/estoque/entrada">
                <Button>Entrada</Button>
              </Link>
            }
          />
        ) : null}
      </div>

      <Card>
        <CardTitle>Últimas movimentações</CardTitle>
        <ul className="mt-3 space-y-2 text-sm">
          {movements.map((m) => {
            const product = products.find((p) => p.id === m.product_id);
            return (
              <li key={m.id} className="flex justify-between gap-2 rounded-2xl bg-mist/70 px-3 py-2">
                <span>
                  {m.type === "entrada" ? "+" : "−"}
                  {m.quantity} {product?.unit} · {product?.name ?? m.barcode}
                </span>
                <span className="text-navy/50">{m.performed_by}</span>
              </li>
            );
          })}
          {movements.length === 0 ? (
            <p className="text-navy/55">Nenhuma movimentação ainda.</p>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
