"use client";

import { FormEvent, useState } from "react";
import {
  ChevronUp,
  FileText,
  GraduationCap,
  Heart,
  Lock,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PixPanel } from "@/components/shop/pix-panel";
import { cn } from "@/lib/utils";
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
  canBuyAccount?: boolean;
  onBuyAccount?: (productId: string) => void;
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

function cleanDescription(text?: string) {
  if (!text) return "";
  return text
    .replace(/\s*[—–-]\s*troque pela descrição real\.?/gi, "")
    .replace(/Produto de exemplo da loja da casa\.?/gi, "")
    .trim();
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
  const [pixOpenId, setPixOpenId] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  function submitGuest(e: FormEvent, productId: string) {
    e.preventDefault();
    onBuyGuest?.(productId, invoice);
    setInvoiceFor(null);
    setInvoice(emptyInvoice);
  }

  function togglePix(productId: string) {
    setPixOpenId((cur) => (cur === productId ? null : productId));
  }

  return (
    <div className="grid gap-3.5">
      {buyError ? (
        <p className="rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {buyError}
        </p>
      ) : null}
      {buyOk ? (
        <p className="rounded-2xl bg-navy/5 px-3 py-2 text-sm text-navy/80">{buyOk}</p>
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
        const showPix = locked || p.kind === "fisico";
        const pixOpen = pixOpenId === p.id;
        const showForm = invoiceFor === p.id;
        const desc = cleanDescription(p.description);

        return (
          <article
            key={p.id}
            className="overflow-hidden rounded-[18px] bg-white shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03]"
          >
            <div className="flex gap-3 p-3.5">
              <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-2xl bg-[#efe6d0]">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-navy">
                    <Icon className="h-7 w-7" strokeWidth={1.75} />
                    {locked ? (
                      <span className="absolute right-1 top-1 rounded-full bg-navy p-0.5 text-cream">
                        <Lock className="h-3 w-3" />
                      </span>
                    ) : null}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-navy">
                      {p.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#efe6d0] px-2 py-0.5 text-[10px] font-semibold text-navy">
                        {kindLabel(p.kind ?? "fisico")}
                      </span>
                      {p.category ? (
                        <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-navy/65">
                          {p.category}
                        </span>
                      ) : null}
                      {unlocked ? (
                        <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-semibold text-leaf">
                          Liberado
                        </span>
                      ) : null}
                      {pending ? (
                        <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-medium text-navy/60">
                          Aguardando
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Favoritar"
                    onClick={() =>
                      setLiked((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                    }
                    className="shrink-0 rounded-full p-1 text-navy/30 transition hover:text-navy/55"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        liked[p.id] && "fill-gold text-gold-deep",
                      )}
                      strokeWidth={1.75}
                    />
                  </button>
                </div>

                {desc ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-navy/55">
                    {desc}
                  </p>
                ) : null}

                {unlocked && p.file_url ? (
                  <a
                    href={p.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-gold-deep underline"
                  >
                    Abrir conteúdo na conta
                  </a>
                ) : null}

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-lg font-semibold text-gold-deep">
                    R$ {p.price.toFixed(2).replace(".", ",")}
                  </p>
                  {showPix ? (
                    <button
                      type="button"
                      onClick={() => togglePix(p.id)}
                      className="rounded-full bg-[#e4d2a0] px-3.5 py-2 text-xs font-bold text-navy shadow-[0_4px_12px_rgba(11,31,58,0.08)] transition hover:bg-[#ebd9ad] active:scale-[0.98]"
                    >
                      Comprar →
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {showPix && pixOpen ? (
              <div className="border-t border-navy/[0.06] bg-[#fbfaf7] px-3.5 py-3.5 transition-all duration-200">
                <button
                  type="button"
                  onClick={() => togglePix(p.id)}
                  className="mb-3 flex w-full items-center gap-2 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6d0] text-gold-deep">
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.85} />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-navy">
                    Pagamento via PIX
                  </span>
                  <ChevronUp className="h-4 w-4 text-navy/40" />
                </button>

                <PixPanel
                  variant="loja"
                  pixKey={houseSettings?.pix_key}
                  holderName={houseSettings?.pix_holder_name}
                  amount={p.price}
                  description={p.name}
                />

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
                    className="mt-3 space-y-2 rounded-xl border border-navy/10 bg-white p-3"
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
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
