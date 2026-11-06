"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Lock, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PixPanel } from "@/components/shop/pix-panel";
import { useAppStore } from "@/hooks/use-app-store";
import { canAccess } from "@/lib/permissions";
import type { ShopProduct, ShopProductKind } from "@/types";

export default function LojaStaffPage() {
  const {
    state,
    currentUser,
    upsertShopProduct,
    removeShopProduct,
    releaseShopPurchase,
    rejectShopPurchase,
  } = useAppStore();
  const canEdit =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";
  const canRelease =
    currentUser?.role === "tesouraria" ||
    currentUser?.role === "administrador" ||
    currentUser?.role === "pai_de_santo";

  const [writing, setWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [available, setAvailable] = useState(true);
  const [kind, setKind] = useState<ShopProductKind>("fisico");
  const [fileUrl, setFileUrl] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [error, setError] = useState("");

  const products = useMemo(
    () =>
      (state.shopProducts ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [state.shopProducts],
  );

  const pendingByProduct = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        purchaseId: string;
        clientName: string;
      }>
    >();
    for (const purchase of state.shopPurchases ?? []) {
      if (purchase.status !== "solicitado") continue;
      const client = (state.clients ?? []).find((c) => c.id === purchase.client_id);
      const list = map.get(purchase.product_id) ?? [];
      list.push({
        purchaseId: purchase.id,
        clientName: client?.full_name ?? "Cliente",
      });
      map.set(purchase.product_id, list);
    }
    return map;
  }, [state.shopPurchases, state.clients]);

  if (!canAccess(currentUser?.role, "shop") || currentUser?.role === "cliente") {
    return <EmptyState title="Acesso restrito à loja da casa" />;
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setAvailable(true);
    setKind("fisico");
    setFileUrl("");
    setRequiresPayment(false);
    setError("");
  }

  function startEdit(p: ShopProduct) {
    setWriting(true);
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description ?? "");
    setPrice(String(p.price));
    setCategory(p.category ?? "");
    setAvailable(p.available);
    setKind(p.kind ?? "fisico");
    setFileUrl(p.file_url ?? "");
    setRequiresPayment(p.requires_payment ?? false);
    setError("");
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = Number(price.replace(",", "."));
    const result = await upsertShopProduct({
      id: editingId ?? undefined,
      name,
      description: description || undefined,
      price: parsed,
      category: category || undefined,
      available,
      kind,
      file_url: fileUrl || undefined,
      requires_payment: requiresPayment || kind === "pdf" || kind === "curso",
      sort_order: editingId
        ? products.find((p) => p.id === editingId)?.sort_order ?? products.length + 1
        : products.length + 1,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    resetForm();
    setWriting(false);
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold-deep">App da Casa</p>
          <h1 className="font-display text-3xl text-navy">Loja</h1>
          <p className="text-sm text-navy/60">
            Vitrine pública e App do Cliente · Pix em cada produto
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRelease ? (
            <Link href="/loja/liberacoes">
              <Button variant="secondary">Todas as liberações</Button>
            </Link>
          ) : null}
          {canEdit ? (
            <Button
              variant={writing ? "secondary" : "primary"}
              onClick={() => {
                if (writing) {
                  resetForm();
                  setWriting(false);
                } else {
                  resetForm();
                  setWriting(true);
                }
              }}
            >
              {writing ? "Fechar" : "Novo produto"}
            </Button>
          ) : null}
        </div>
      </div>

      <PixPanel
        pixKey={state.houseSettings?.pix_key}
        holderName={state.houseSettings?.pix_holder_name}
      />

      {writing && canEdit ? (
        <Card>
          <CardTitle>{editingId ? "Editar produto" : "Novo produto"}</CardTitle>
          <form onSubmit={onSave} className="mt-4 space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                value={kind}
                onChange={(e) => {
                  const k = e.target.value as ShopProductKind;
                  setKind(k);
                  if (k === "pdf" || k === "curso") setRequiresPayment(true);
                }}
                className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy"
              >
                <option value="fisico">Físico</option>
                <option value="pdf">PDF</option>
                <option value="curso">Curso</option>
              </select>
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="25,00"
                required
              />
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Velas, Cursos…"
              />
            </div>
            {(kind === "pdf" || kind === "curso") && (
              <div>
                <Label>URL do arquivo / curso (após liberação)</Label>
                <Input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            )}
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-navy/80">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              Disponível na vitrine
            </label>
            <label className="flex items-center gap-2 text-sm text-navy/80">
              <input
                type="checkbox"
                checked={requiresPayment}
                onChange={(e) => setRequiresPayment(e.target.checked)}
              />
              Bloqueado até o Financeiro liberar (cadeado)
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit" variant="gold" className="w-full">
              {editingId ? "Salvar alterações" : "Publicar produto"}
            </Button>
          </form>
          <div className="mt-4">
            <p className="mb-2 text-xs text-navy/50">Prévia do Pix neste produto</p>
            <PixPanel
              pixKey={state.houseSettings?.pix_key}
              holderName={state.houseSettings?.pix_holder_name}
              amount={Number(price.replace(",", ".")) || undefined}
              description={name || "Produto"}
            />
          </div>
        </Card>
      ) : null}

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto cadastrado" />
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist">
                  <ShoppingBag className="h-5 w-5 text-gold-deep" />
                  {p.requires_payment ? (
                    <span className="absolute -right-1 -top-1 rounded-full bg-navy p-0.5 text-cream">
                      <Lock className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{p.name}</CardTitle>
                      <p className="mt-1 font-display text-lg text-gold-deep">
                        R$ {p.price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <Badge tone={p.available ? "success" : "warning"}>
                      {p.available ? "À venda" : "Oculto"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-navy/50">
                    {p.kind ?? "fisico"}
                    {p.category ? ` · ${p.category}` : ""}
                    {p.requires_payment ? " · bloqueado" : ""}
                  </p>
                  {p.description ? (
                    <p className="mt-2 text-sm text-navy/70">{p.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs leading-relaxed text-navy/55">
                    Aviso ao cliente: liberação pode levar até 3 dias úteis após o Pix.
                  </p>
                  {canEdit ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void upsertShopProduct({
                            ...p,
                            kind: p.kind ?? "fisico",
                            requires_payment: p.requires_payment ?? false,
                            available: !p.available,
                          })
                        }
                      >
                        {p.available ? "Ocultar" : "Mostrar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Remover “${p.name}”?`)) void removeShopProduct(p.id);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : null}

                  {canRelease ? (
                    <div className="mt-3 space-y-2 border-t border-navy/10 pt-3">
                      {(pendingByProduct.get(p.id) ?? []).length === 0 ? (
                        <p className="text-xs text-navy/45">
                          Nenhuma compra aguardando liberação
                        </p>
                      ) : (
                        (pendingByProduct.get(p.id) ?? []).map((req) => (
                          <div
                            key={req.purchaseId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mist/70 px-3 py-2"
                          >
                            <p className="text-sm text-navy">
                              <span className="font-medium">{req.clientName}</span>
                              <span className="text-navy/50"> · aguardando Pix</span>
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="gold"
                                onClick={() => releaseShopPurchase(req.purchaseId)}
                              >
                                Liberar
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => rejectShopPurchase(req.purchaseId)}
                              >
                                Recusar
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
