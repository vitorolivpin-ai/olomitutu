"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { BarcodeScanner } from "@/components/stock/barcode-scanner";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDate } from "@/lib/format";
import { canAccess } from "@/lib/permissions";
import {
  findProductByBarcode,
  lotStatus,
  productTotalQty,
} from "@/lib/stock";

export default function EstoqueSaidaPage() {
  const { state, currentUser, stockExit } = useAppStore();
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const product = useMemo(
    () => findProductByBarcode(state.stockProducts ?? [], barcode),
    [state.stockProducts, barcode],
  );
  const total = product ? productTotalQty(product.id, state.stockLots ?? []) : 0;
  const lots = (state.stockLots ?? [])
    .filter((l) => l.product_id === product?.id && l.quantity > 0)
    .sort((a, b) => a.expires_at.localeCompare(b.expires_at));

  if (!canAccess(currentUser?.role, "stock")) {
    return <EmptyState title="Acesso restrito ao estoque" />;
  }

  function onScan(code: string) {
    setBarcode(code);
    setError("");
    setOk("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!barcode.trim()) {
      setError("Leia o código de barras do produto para dar baixa.");
      return;
    }
    const result = stockExit({
      barcode: barcode.trim(),
      quantity: Number(quantity),
      note: note.trim() || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(`Baixa ok: ${result.product.name} −${quantity} ${result.product.unit}`);
    setQuantity("1");
    setNote("");
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Saída / baixa"
        subtitle="Escaneie o código para retirar. A baixa usa primeiro o lote que vence antes."
        backHref="/estoque"
        backLabel="Estoque"
      />

      <Card>
        <BarcodeScanner onScan={onScan} label="Código do produto a retirar" />
        {barcode ? (
          <p className="mt-3 rounded-2xl bg-mist/80 px-3 py-2 text-sm text-navy">
            Código lido: <strong>{barcode}</strong>
          </p>
        ) : null}
      </Card>

      {product ? (
        <Card>
          <CardTitle>{product.name}</CardTitle>
          <p className="mt-1 text-sm text-navy/60">
            Saldo atual: <strong>{total}</strong> {product.unit}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {lots.map((lot) => {
              const status = lotStatus(lot.expires_at, lot.quantity);
              return (
                <li
                  key={lot.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-mist/70 px-3 py-2"
                >
                  <span>
                    {lot.quantity} {product.unit} · val. {formatDate(lot.expires_at)}
                  </span>
                  <Badge
                    tone={
                      status === "vencido"
                        ? "danger"
                        : status === "proximo"
                          ? "warning"
                          : "success"
                    }
                  >
                    {status === "vencido"
                      ? "VENCIDO"
                      : status === "proximo"
                        ? "PERTO"
                        : "OK"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : barcode ? (
        <ErrorMessage message="Código não encontrado. Cadastre pela entrada primeiro." />
      ) : null}

      <Card>
        <CardTitle>Confirmar baixa</CardTitle>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Motivo / observação</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: uso no atendimento"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            {error ? <ErrorMessage message={error} /> : null}
            {ok ? <p className="text-sm text-success">{ok}</p> : null}
            <Button type="submit" variant="danger" className="w-full sm:w-auto">
              Confirmar baixa
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
