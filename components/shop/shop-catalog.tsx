"use client";

import { Lock, ShoppingBag, FileText, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PixPanel } from "@/components/shop/pix-panel";
import type { HouseSettings, ShopProduct, ShopPurchase } from "@/types";

type Props = {
  products: ShopProduct[];
  houseSettings?: HouseSettings | null;
  purchases?: ShopPurchase[];
  clientId?: string | null;
  canBuy?: boolean;
  onBuy?: (productId: string) => void;
  buyError?: string | null;
  buyOk?: string | null;
};

function kindIcon(kind: ShopProduct["kind"]) {
  if (kind === "pdf") return FileText;
  if (kind === "curso") return GraduationCap;
  return ShoppingBag;
}

function kindLabel(kind: ShopProduct["kind"]) {
  if (kind === "pdf") return "PDF";
  if (kind === "curso") return "Curso";
  return "Produto";
}

export function ShopCatalog({
  products,
  houseSettings,
  purchases = [],
  clientId,
  canBuy,
  onBuy,
  buyError,
  buyOk,
}: Props) {
  return (
    <div className="grid gap-3">
      {buyError ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{buyError}</p>
      ) : null}
      {buyOk ? (
        <p className="rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy/80">{buyOk}</p>
      ) : null}
      {products.map((p) => {
        const Icon = kindIcon(p.kind ?? "fisico");
        const unlocked = purchases.some(
          (x) =>
            x.product_id === p.id &&
            x.client_id === clientId &&
            x.status === "pago_liberado",
        );
        const pending = purchases.some(
          (x) =>
            x.product_id === p.id &&
            x.client_id === clientId &&
            x.status === "solicitado",
        );
        const locked = Boolean(p.requires_payment) && !unlocked;
        return (
          <Card key={p.id} className="border-l-4 border-l-gold">
            <div className="flex items-start gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mist">
                <Icon className="h-5 w-5 text-gold-deep" />
                {locked ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-navy p-0.5 text-cream">
                    <Lock className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  <p className="shrink-0 font-display text-lg text-gold-deep">
                    R$ {p.price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="gold">{kindLabel(p.kind ?? "fisico")}</Badge>
                  {p.category ? <Badge>{p.category}</Badge> : null}
                  {locked ? <Badge tone="danger">Bloqueado</Badge> : null}
                  {unlocked ? <Badge tone="success">Liberado</Badge> : null}
                  {pending ? <Badge>Aguardando pagamento</Badge> : null}
                </div>
                {p.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-navy/70">{p.description}</p>
                ) : null}

                {unlocked && p.file_url ? (
                  <a
                    href={p.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-gold-deep underline"
                  >
                    Abrir conteúdo
                  </a>
                ) : null}

                {(locked || p.kind === "fisico") && (
                  <div className="mt-3">
                    <PixPanel
                      pixKey={houseSettings?.pix_key}
                      holderName={houseSettings?.pix_holder_name}
                      amount={p.price}
                      description={p.name}
                    />
                  </div>
                )}

                {canBuy && locked && !pending ? (
                  <Button
                    variant="gold"
                    className="mt-3 w-full"
                    onClick={() => onBuy?.(p.id)}
                  >
                    Quero comprar — avisar Financeiro
                  </Button>
                ) : null}
                {!canBuy && locked ? (
                  <p className="mt-3 text-xs text-navy/50">
                    Entre no App do Cliente para solicitar a liberação após o Pix.
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
