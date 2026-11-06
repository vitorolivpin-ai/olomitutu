"use client";

import { FormEvent, useState } from "react";
import { Lock, ShoppingBag, FileText, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PixPanel } from "@/components/shop/pix-panel";
import type {
  HouseSettings,
  ShopInvoiceForm,
  ShopProduct,
  ShopPurchase,
} from "@/types";

type Props = {
  products: ShopProduct[];
  houseSettings?: HouseSettings | null;
  purchases?: ShopPurchase[];
  clientId?: string | null;
  /** Cliente logado: compra libera na conta */
  canBuyAccount?: boolean;
  onBuyAccount?: (productId: string) => void;
  /** Visitante: ficha NF + envio por e-mail */
  canBuyGuest?: boolean;
  onBuyGuest?: (productId: string, invoice: ShopInvoiceForm) => void;
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

const emptyInvoice: ShopInvoiceForm = {
  full_name: "",
  email: "",
  cpf_cnpj: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export function ShopCatalog({
  products,
  houseSettings,
  purchases = [],
  clientId,
  canBuyAccount,
  onBuyAccount,
  canBuyGuest,
  onBuyGuest,
  buyError,
  buyOk,
}: Props) {
  const [invoiceFor, setInvoiceFor] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<ShopInvoiceForm>(emptyInvoice);

  function submitGuest(e: FormEvent, productId: string) {
    e.preventDefault();
    onBuyGuest?.(productId, invoice);
    setInvoiceFor(null);
    setInvoice(emptyInvoice);
  }

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
            ((clientId && x.client_id === clientId) ||
              (!clientId && x.delivery === "email")) &&
            x.status === "solicitado",
        );
        const locked = Boolean(p.requires_payment) && !unlocked;
        const digital =
          p.requires_payment || p.kind === "pdf" || p.kind === "curso";
        const showForm = invoiceFor === p.id;

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
                  {unlocked ? <Badge tone="success">Liberado na conta</Badge> : null}
                  {pending ? <Badge>Aguardando pagamento</Badge> : null}
                </div>
                {p.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-navy/70">{p.description}</p>
                ) : null}

                <p className="mt-2 text-xs leading-relaxed text-navy/55">
                  {digital
                    ? "Com conta: o conteúdo é liberado no App do Cliente. Sem conta: preencha a ficha de NF e o material é enviado por e-mail. Pode levar até 3 dias úteis após o Pix."
                    : "Pedidos com a casa podem levar até 3 dias úteis para confirmação."}
                </p>

                {unlocked && p.file_url ? (
                  <a
                    href={p.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-gold-deep underline"
                  >
                    Abrir conteúdo na conta
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

                {canBuyAccount && locked && !pending ? (
                  <Button
                    variant="gold"
                    className="mt-3 w-full"
                    onClick={() => onBuyAccount?.(p.id)}
                  >
                    Comprar — liberar na minha conta
                  </Button>
                ) : null}

                {canBuyGuest && locked && !pending && !showForm ? (
                  <Button
                    variant="secondary"
                    className="mt-2 w-full"
                    onClick={() => {
                      setInvoiceFor(p.id);
                      setInvoice(emptyInvoice);
                    }}
                  >
                    Sem conta — ficha NF e envio por e-mail
                  </Button>
                ) : null}

                {canBuyGuest && locked && showForm ? (
                  <form
                    className="mt-3 space-y-2 rounded-xl border border-navy/10 bg-mist/50 p-3"
                    onSubmit={(e) => submitGuest(e, p.id)}
                  >
                    <p className="text-sm font-semibold text-navy">
                      Ficha para nota fiscal e envio por e-mail
                    </p>
                    <div>
                      <Label>Nome completo</Label>
                      <Input
                        required
                        value={invoice.full_name}
                        onChange={(e) =>
                          setInvoice((v) => ({ ...v, full_name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>E-mail (receberá o conteúdo e a NF)</Label>
                      <Input
                        type="email"
                        required
                        value={invoice.email}
                        onChange={(e) =>
                          setInvoice((v) => ({ ...v, email: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>CPF ou CNPJ</Label>
                      <Input
                        required
                        value={invoice.cpf_cnpj}
                        onChange={(e) =>
                          setInvoice((v) => ({ ...v, cpf_cnpj: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Telefone (opcional)</Label>
                      <Input
                        value={invoice.phone ?? ""}
                        onChange={(e) =>
                          setInvoice((v) => ({ ...v, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Endereço (opcional)</Label>
                      <Input
                        value={invoice.address ?? ""}
                        onChange={(e) =>
                          setInvoice((v) => ({ ...v, address: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Cidade</Label>
                        <Input
                          value={invoice.city ?? ""}
                          onChange={(e) =>
                            setInvoice((v) => ({ ...v, city: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>UF</Label>
                        <Input
                          value={invoice.state ?? ""}
                          onChange={(e) =>
                            setInvoice((v) => ({ ...v, state: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>CEP</Label>
                      <Input
                        value={invoice.zip ?? ""}
                        onChange={(e) =>
                          setInvoice((v) => ({ ...v, zip: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" variant="gold" className="flex-1">
                        Enviar pedido
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setInvoiceFor(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
