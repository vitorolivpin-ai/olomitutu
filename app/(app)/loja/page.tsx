"use client";

import { FormEvent, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { canAccess } from "@/lib/permissions";
import type { ShopProduct } from "@/types";

export default function LojaStaffPage() {
  const { state, currentUser, upsertShopProduct, removeShopProduct } = useAppStore();
  const canEdit =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";

  const [writing, setWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState("");

  const products = useMemo(
    () =>
      (state.shopProducts ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [state.shopProducts],
  );

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
            Produtos visíveis no App do Cliente
          </p>
        </div>
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

      {writing && canEdit ? (
        <Card>
          <CardTitle>{editingId ? "Editar produto" : "Novo produto"}</CardTitle>
          <form onSubmit={onSave} className="mt-4 space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
                placeholder="Velas, Banho…"
              />
            </div>
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
              Disponível na vitrine do cliente
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit" variant="gold" className="w-full">
              {editingId ? "Salvar alterações" : "Publicar produto"}
            </Button>
          </form>
        </Card>
      ) : null}

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto cadastrado" />
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist">
                  <ShoppingBag className="h-5 w-5 text-gold-deep" />
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
                  {p.category ? (
                    <p className="mt-1 text-xs text-navy/50">{p.category}</p>
                  ) : null}
                  {p.description ? (
                    <p className="mt-2 text-sm text-navy/70">{p.description}</p>
                  ) : null}
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
