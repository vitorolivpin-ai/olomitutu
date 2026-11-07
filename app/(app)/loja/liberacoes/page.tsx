"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";

export default function LojaLiberacoesPage() {
  const {
    state,
    currentUser,
    releaseShopPurchase,
    rejectShopPurchase,
  } = useAppStore();

  const canManage =
    currentUser?.role === "tesouraria" ||
    currentUser?.role === "administrador" ||
    currentUser?.role === "pai_de_santo";
  const canView = canManage;

  const rows = useMemo(() => {
    return (state.shopPurchases ?? [])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => {
        const product = (state.shopProducts ?? []).find((x) => x.id === p.product_id);
        const client = p.client_id
          ? (state.clients ?? []).find((c) => c.id === p.client_id)
          : null;
        const byEmail = p.delivery === "email" || !p.client_id;
        return { purchase: p, product, client, byEmail };
      });
  }, [state.shopPurchases, state.shopProducts, state.clients]);

  const pending = rows.filter((r) => r.purchase.status === "solicitado");

  if (!canView) {
    return <EmptyState title="Acesso restrito ao Financeiro" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Liberações da loja"
        subtitle="Conta: libera no app. Sem conta: envie o arquivo por e-mail usando a ficha de NF."
        backHref="/loja"
        backLabel="Loja"
      />

      {pending.length === 0 ? (
        <EmptyState title="Nenhuma compra aguardando liberação" />
      ) : (
        <div className="grid gap-3">
          {pending.map(({ purchase, product, client, byEmail }) => (
            <Card key={purchase.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>{product?.name ?? "Produto"}</CardTitle>
                  <p className="mt-1 text-sm text-navy/65">
                    R$ {(product?.price ?? 0).toFixed(2).replace(".", ",")}
                  </p>
                  <Badge tone={byEmail ? "info" : "gold"} className="mt-2">
                    {byEmail ? "Envio por e-mail + NF" : "Liberar na conta"}
                  </Badge>
                  {byEmail && purchase.invoice ? (
                    <div className="mt-3 space-y-1 rounded-lg bg-mist/70 px-3 py-2 text-sm text-navy/80">
                      <p>
                        <strong>Nome:</strong> {purchase.invoice.full_name}
                      </p>
                      <p>
                        <strong>E-mail:</strong>{" "}
                        {purchase.guest_email ?? purchase.invoice.email}
                      </p>
                      <p>
                        <strong>CPF/CNPJ:</strong> {purchase.invoice.cpf_cnpj}
                      </p>
                      {purchase.invoice.phone ? (
                        <p>
                          <strong>Tel:</strong> {purchase.invoice.phone}
                        </p>
                      ) : null}
                      {purchase.invoice.address ? (
                        <p>
                          <strong>Endereço:</strong> {purchase.invoice.address}
                          {purchase.invoice.city ? `, ${purchase.invoice.city}` : ""}
                          {purchase.invoice.state ? `/${purchase.invoice.state}` : ""}
                          {purchase.invoice.zip ? ` · ${purchase.invoice.zip}` : ""}
                        </p>
                      ) : null}
                      <p className="text-xs text-navy/50">
                        Após Liberar, envie o PDF/curso e a NF para este e-mail.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-navy/65">
                      Cliente: {client?.full_name ?? "—"}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-navy/45">
                    {formatDateTime(purchase.created_at)}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="gold"
                      onClick={() => releaseShopPurchase(purchase.id)}
                    >
                      {byEmail ? "Marcar enviado" : "Liberar na conta"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => rejectShopPurchase(purchase.id)}
                    >
                      Recusar
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {rows.some((r) => r.purchase.status !== "solicitado") ? (
        <div className="space-y-2">
          <h2 className="font-display text-xl text-navy">Histórico</h2>
          {rows
            .filter((r) => r.purchase.status !== "solicitado")
            .map(({ purchase, product, client, byEmail }) => (
              <Card key={purchase.id}>
                <p className="font-semibold text-navy">
                  {product?.name} ·{" "}
                  {byEmail
                    ? purchase.guest_email ?? purchase.invoice?.email
                    : client?.full_name}
                </p>
                <Badge
                  tone={purchase.status === "pago_liberado" ? "success" : "danger"}
                  className="mt-2"
                >
                  {purchase.status === "pago_liberado"
                    ? byEmail
                      ? "Enviado / NF"
                      : "Liberado na conta"
                    : "Recusado"}
                </Badge>
              </Card>
            ))}
        </div>
      ) : null}
    </div>
  );
}
