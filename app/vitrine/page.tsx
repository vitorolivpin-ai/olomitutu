"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BrandMark } from "@/components/brand/logo";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";

/** Vitrine pública — qualquer pessoa, sem login. */
export default function PublicLojaPage() {
  const { state } = useAppStore();

  const products = useMemo(
    () =>
      (state.shopProducts ?? [])
        .filter((p) => p.available)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [state.shopProducts],
  );

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
            Produtos, PDFs e cursos da casa. Pix na hora.
          </p>
        </div>

        {products.length === 0 ? (
          <EmptyState title="Nenhum produto disponível no momento" />
        ) : (
          <ShopCatalog
            products={products}
            houseSettings={state.houseSettings}
            canBuy={false}
          />
        )}

        <p className="text-center text-sm text-navy/55">
          Já é cliente?{" "}
          <Link href="/entrar/cliente" className="text-navy underline">
            Entre para comprar conteúdo bloqueado
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
