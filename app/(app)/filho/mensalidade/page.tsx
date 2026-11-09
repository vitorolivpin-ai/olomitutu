"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { memberForProfile } from "@/lib/ensure-filho-member";
import { isFilhoDeSanto } from "@/lib/filho";
import {
  formatCompetence,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { buildPixCopyPaste, pixQrDataUrl } from "@/lib/pix";
import type { MonthlyFee, PaymentMethod } from "@/types";

export default function FilhoMensalidadePage() {
  const [reciboId, setReciboId] = useState<string | null>(null);
  const {
    state,
    currentUser,
    confirmFeePayment,
    savePaymentRecord,
  } = useAppStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReciboId(new URLSearchParams(window.location.search).get("recibo"));
  }, []);

  const member = memberForProfile(state.members, currentUser?.id);
  const fees = useMemo(
    () =>
      (state.monthlyFees ?? [])
        .filter((f) => f.member_id === member?.id)
        .sort((a, b) => b.competence.localeCompare(a.competence)),
    [state.monthlyFees, member?.id],
  );
  const receipts = useMemo(
    () =>
      (state.feeReceipts ?? [])
        .filter((r) => r.member_id === member?.id || r.profile_id === currentUser?.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [state.feeReceipts, member?.id, currentUser?.id],
  );

  const [payingId, setPayingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState<string | null>(null);

  if (!isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  if (!member) {
    return (
      <EmptyState
        title="Cadastro financeiro pendente"
        description="O Financeiro ainda não vinculou sua mensalidade. Fale com a casa."
      />
    );
  }

  const house = state.houseSettings ?? {};
  const paying = fees.find((f) => f.id === payingId);

  function pixPayload(fee: MonthlyFee) {
    if (!house.pix_key) return "";
    return buildPixCopyPaste({
      key: house.pix_key,
      holderName: house.pix_holder_name,
      amount: fee.amount,
      description: `Mensalidade ${fee.competence}`,
    });
  }

  async function copyPix(fee: MonthlyFee) {
    const payload = pixPayload(fee);
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function confirmPay(fee: MonthlyFee, method: PaymentMethod = "PIX") {
    setError("");
    savePaymentRecord({
      id: `pay_${fee.id}_${Date.now()}`,
      monthly_fee_id: fee.id,
      method,
      amount: fee.amount,
      status: "pending",
      pix_copy_paste: pixPayload(fee) || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const updated = confirmFeePayment(fee.id, {
      method,
      amount: fee.amount,
      observation: "Pagamento registrado pelo Filho de Santo no app",
    });
    if (!updated) {
      setError("Não foi possível confirmar o pagamento.");
      return;
    }
    setDoneId(fee.id);
    setPayingId(null);
  }

  const highlightReceipt = receipts.find((r) => r.id === reciboId) ?? receipts[0];

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Mensalidade"
        subtitle={`Valor: ${formatCurrency(member.monthly_fee_amount)} · vencimento dia ${member.due_day}`}
        backHref="/filho"
        backLabel="Início"
      />

      {doneId || highlightReceipt ? (
        <Card className="border-l-4 border-l-leaf">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
            <div>
              <CardTitle>Comprovante</CardTitle>
              {highlightReceipt ? (
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy/55">Recibo</dt>
                    <dd>{highlightReceipt.number}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy/55">Competência</dt>
                    <dd>{formatCompetence(highlightReceipt.competence)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy/55">Valor</dt>
                    <dd>{formatCurrency(highlightReceipt.amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy/55">Pago em</dt>
                    <dd>{formatDateTime(highlightReceipt.paid_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy/55">E-mail</dt>
                    <dd>
                      {highlightReceipt.email_sent
                        ? "Enviado"
                        : highlightReceipt.email_error || "Disponível só no app"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-navy/65">Pagamento registrado.</p>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {paying ? (
        <Card>
          <CardTitle>Pagar {formatCompetence(paying.competence)}</CardTitle>
          <p className="mt-1 text-2xl font-display text-navy">
            {formatCurrency(paying.amount)}
          </p>
          <p className="text-sm text-navy/55">Vencimento {formatDate(paying.due_date)}</p>

          {house.pix_key ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-navy/70">
                Pix da casa
                {house.pix_holder_name ? ` · ${house.pix_holder_name}` : ""}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pixQrDataUrl(pixPayload(paying), "Mensalidade")}
                alt="QR Pix"
                className="mx-auto h-48 w-48 rounded-xl border border-navy/10 bg-white p-2"
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void copyPix(paying)}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copiado" : "Copiar Pix"}
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-amber-900">
              A casa ainda não cadastrou a chave Pix no perfil. Use o chat do Financeiro.
            </p>
          )}

          {error ? <ErrorMessage message={error} /> : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="gold" onClick={() => confirmPay(paying, "PIX")}>
              Confirmar pagamento
            </Button>
            <Button variant="secondary" onClick={() => setPayingId(null)}>
              Cancelar
            </Button>
          </div>
          <p className="mt-2 text-xs text-navy/45">
            Após confirmar, o comprovante fica no app e é enviado por e-mail quando o envio
            estiver configurado.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3">
        <h2 className="font-display text-xl text-navy">Cobranças</h2>
        {fees.length === 0 ? (
          <EmptyState title="Nenhuma cobrança ainda" />
        ) : (
          fees.map((fee) => (
            <Card key={fee.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-navy">
                    {formatCompetence(fee.competence)}
                  </p>
                  <p className="text-sm text-navy/60">
                    {formatCurrency(fee.amount)} · venc. {formatDate(fee.due_date)}
                  </p>
                </div>
                <Badge tone={feeStatusTone(fee.status)}>{fee.status}</Badge>
              </div>
              {fee.status === "AGUARDANDO" || fee.status === "VENCIDO" ? (
                <Button
                  className="mt-3"
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    setDoneId(null);
                    setPayingId(fee.id);
                  }}
                >
                  Pagar
                </Button>
              ) : null}
              {fee.status === "PAGO" && fee.paid_at ? (
                <p className="mt-2 text-xs text-navy/50">
                  Pago em {formatDateTime(fee.paid_at)}
                  {fee.payment_method ? ` · ${fee.payment_method}` : ""}
                </p>
              ) : null}
            </Card>
          ))
        )}
      </div>

      {receipts.length > 0 ? (
        <div className="grid gap-3">
          <h2 className="font-display text-xl text-navy">Recibos</h2>
          {receipts.map((r) => (
            <Card key={r.id}>
              <p className="font-medium text-navy">{r.number}</p>
              <p className="text-sm text-navy/60">
                {formatCompetence(r.competence)} · {formatCurrency(r.amount)} ·{" "}
                {formatDateTime(r.paid_at)}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

    </div>
  );
}
