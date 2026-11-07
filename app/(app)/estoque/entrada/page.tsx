"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { BarcodeScanner } from "@/components/stock/barcode-scanner";
import { useAppStore } from "@/hooks/use-app-store";
import { canAccess } from "@/lib/permissions";
import { findProductByBarcode } from "@/lib/stock";
import { EmptyState } from "@/components/ui/empty-state";

export default function EstoqueEntradaPage() {
  const { state, currentUser, stockEntry } = useAppStore();
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("un");
  const [category, setCategory] = useState("materiais");
  const [quantity, setQuantity] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [batch, setBatch] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const known = useMemo(
    () => findProductByBarcode(state.stockProducts ?? [], barcode),
    [state.stockProducts, barcode],
  );

  if (!canAccess(currentUser?.role, "stock")) {
    return <EmptyState title="Acesso restrito ao estoque" />;
  }

  function onScan(code: string) {
    setBarcode(code);
    setError("");
    setOk("");
    const product = findProductByBarcode(state.stockProducts ?? [], code);
    if (product) {
      setName(product.name);
      setUnit(product.unit);
      setCategory(product.category ?? "materiais");
    } else {
      setName("");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!barcode.trim()) {
      setError("Leia ou digite o código de barras.");
      return;
    }
    const result = stockEntry({
      barcode: barcode.trim(),
      name: name.trim() || undefined,
      unit,
      category,
      quantity: Number(quantity),
      expires_at: expiresAt,
      batch_code: batch.trim() || undefined,
      note: note.trim() || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(
      `Entrada ok: ${result.product.name} +${quantity} ${result.product.unit} (val. ${expiresAt})`,
    );
    setQuantity("1");
    setBatch("");
    setNote("");
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Entrada no estoque"
        subtitle="Escaneie o produto, informe validade e quantidade"
        backHref="/estoque"
        backLabel="Estoque"
      />

      <Card>
        <BarcodeScanner onScan={onScan} />
        {barcode ? (
          <p className="mt-3 rounded-2xl bg-mist/80 px-3 py-2 text-sm text-navy">
            Código lido: <strong>{barcode}</strong>
            {known ? ` · ${known.name}` : " · produto novo"}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Dados da entrada</CardTitle>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do produto</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={known ? known.name : "Obrigatório se for novo"}
              required={!known}
            />
          </div>
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
            <Label>Validade</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Unidade</Label>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="un">un</option>
              <option value="pct">pct</option>
              <option value="kg">kg</option>
              <option value="L">L</option>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="materiais">materiais</option>
              <option value="oferendas">oferendas</option>
              <option value="limpeza">limpeza</option>
              <option value="alimentos">alimentos</option>
              <option value="outras">outras</option>
            </Select>
          </div>
          <div>
            <Label>Lote (opcional)</Label>
            <Input value={batch} onChange={(e) => setBatch(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observação</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            {error ? <ErrorMessage message={error} /> : null}
            {ok ? <p className="text-sm text-success">{ok}</p> : null}
            <Button type="submit" className="w-full sm:w-auto">
              Confirmar entrada
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-navy/50">
          Códigos demo: 7891000100103 (vela), 7891000100202 (mel), 7891000100301 (sabão).
        </p>
      </Card>
    </div>
  );
}
