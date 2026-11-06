"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";

export default function ClienteLojaPage() {
  const { state, currentUser } = useAppStore();

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

  return (
    <div className="animate-rise space-y-5">
      <div>
        <Link href="/cliente" className="text-sm text-navy/55 hover:text-navy">
          ← Quem somos
        </Link>
        <p className="mt-2 text-sm font-medium text-gold-deep">Área do cliente</p>
        <h1 className="font-display text-3xl text-navy">Loja da casa</h1>
        <p className="text-sm text-navy/60">
          Produtos à venda — combine retirada ou entrega pelo chat com o Pai.
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto disponível no momento" />
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <Card key={p.id} className="border-l-4 border-l-gold">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mist">
                  <ShoppingBag className="h-5 w-5 text-gold-deep" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-xl">{p.name}</CardTitle>
                    <p className="shrink-0 font-display text-lg text-gold-deep">
                      R$ {p.price.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  {p.category ? (
                    <Badge tone="gold" className="mt-2">
                      {p.category}
                    </Badge>
                  ) : null}
                  {p.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-navy/70">{p.description}</p>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardTitle>Como comprar</CardTitle>
        <p className="mt-2 text-sm text-navy/65">
          Abra o chat com o Pai, diga o produto e combine pagamento e entrega.
        </p>
        <Link href="/cliente/mensagens" className="mt-4 block">
          <Button variant="gold" className="w-full">
            Falar com o Pai
          </Button>
        </Link>
      </Card>
    </div>
  );
}
