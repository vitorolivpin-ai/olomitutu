"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatCompetence, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getPaymentProvider, type BoletoPayment, type PixPayment } from "@/services/payments";
import { nowIso, uid } from "@/lib/utils";
import type { Payment } from "@/types";

export function MonthlyFeeDetail({ feeId }: { feeId: string }) {
  const router = useRouter();
  const { state, confirmFeePayment, savePaymentRecord } = useAppStore();
  const fee = state.monthlyFees.find((item) => item.id === feeId);
  const member = state.members.find((item) => item.id === fee?.member_id);
  const [method, setMethod] = useState<"PIX" | "BOLETO" | null>(null);
  const [pix, setPix] = useState<PixPayment | null>(null);
  const [boleto, setBoleto] = useState<BoletoPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  if (!fee || !member) {
    return (
      <EmptyState
        title="Mensalidade não encontrada"
        action={
          <Link href="/mensalidades">
            <Button>Voltar</Button>
          </Link>
        }
      />
    );
  }

  const currentFee = fee;
  const currentMember = member;
  const paymentHistory = state.payments
    .filter((payment) => payment.monthly_fee_id === fee.id)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const receipts = state.feeReceipts
    .filter((receipt) => receipt.monthly_fee_id === fee.id)
    .slice()
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
  const financialHistory = paymentHistory.length > 0 || receipts.length > 0 ? (
    <Card>
      <CardTitle>Histórico financeiro</CardTitle>
      <ul className="mt-3 space-y-3">
        {paymentHistory.map((payment) => (
          <li key={payment.id} className="flex flex-wrap justify-between gap-2 border-t border-navy/10 pt-3 text-sm">
            <span>{payment.method} · {payment.status} · {formatDateTime(payment.created_at)}</span>
            <strong>{formatCurrency(payment.amount)}</strong>
          </li>
        ))}
        {receipts.map((receipt) => (
          <li key={receipt.id} className="flex flex-wrap justify-between gap-2 border-t border-navy/10 pt-3 text-sm">
            <span>Recibo {receipt.number} · {formatDateTime(receipt.paid_at)}</span>
            <strong>{formatCurrency(receipt.amount)}</strong>
          </li>
        ))}
      </ul>
    </Card>
  ) : null;

  async function openPix() {
    setError("");
    setMethod("PIX");
    const payment = await getPaymentProvider().createPix({
      amount: currentFee.amount,
      dueDate: currentFee.due_date,
      payerName: currentMember.full_name,
      description: `Mensalidade ${currentFee.competence}`,
    });
    setPix(payment);
    setBoleto(null);
    savePaymentRecord({
      id: payment.id,
      monthly_fee_id: currentFee.id,
      method: "PIX",
      amount: payment.amount,
      status: "pending",
      pix_copy_paste: payment.copyPaste,
      created_at: nowIso(),
      updated_at: nowIso(),
    } satisfies Payment);
  }

  async function openBoleto() {
    setError("");
    setMethod("BOLETO");
    const payment = await getPaymentProvider().createBoleto({
      amount: currentFee.amount,
      dueDate: currentFee.due_date,
      payerName: currentMember.full_name,
    });
    setBoleto(payment);
    setPix(null);
    savePaymentRecord({
      id: payment.id,
      monthly_fee_id: currentFee.id,
      method: "BOLETO",
      amount: payment.amount,
      status: "pending",
      boleto_code: payment.digitableLine,
      created_at: nowIso(),
      updated_at: nowIso(),
    } satisfies Payment);
  }

  async function copyPix() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function simulatePay() {
    try {
      const provider = getPaymentProvider();
      const paymentId = pix?.id ?? boleto?.id;
      if (paymentId && provider.simulatePayment) await provider.simulatePayment(paymentId);
      confirmFeePayment(currentFee.id, {
        method: method ?? "PIX",
        amount: currentFee.amount,
        observation: "Pagamento simulado no modo demonstração",
      });
    } catch {
      setError("Não foi possível simular o pagamento.");
    }
  }

  function downloadBoleto() {
    if (!boleto) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Boleto demonstrativo</title>
      <style>body{font-family:sans-serif;padding:24px;color:#0B1F3A} .box{border:2px solid #C9A227;padding:20px;border-radius:16px;max-width:640px}</style>
      </head><body><div class="box">
      <h1>Boleto demonstrativo</h1>
      <p><strong>Beneficiário:</strong> ${boleto.beneficiary}</p>
      <p><strong>Pagador:</strong> ${boleto.payer}</p>
      <p><strong>Valor:</strong> ${formatCurrency(boleto.amount)}</p>
      <p><strong>Vencimento:</strong> ${formatDate(boleto.dueDate)}</p>
      <p><strong>Linha digitável:</strong> ${boleto.digitableLine}</p>
      <p style="color:#c0392b">Cobrança demonstrativa. Nenhuma transação bancária real será realizada.</p>
      </div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `boleto-demo-${boleto.id}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (fee.status === "PAGO") {
    return (
      <div className="animate-rise space-y-5">
        <Card className="text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <CardTitle className="mt-3 text-2xl">Pagamento confirmado</CardTitle>
          <p className="mt-2 text-sm text-navy/65">
            {member.full_name} · {formatCompetence(fee.competence)} · {formatCurrency(fee.amount)}
          </p>
          <p className="mt-1 text-xs text-navy/50">{formatDateTime(fee.paid_at ?? nowIso())}</p>
        </Card>
        <Card>
          <CardTitle>Recibo interno</CardTitle>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Valor</dt><dd>{formatCurrency(fee.amount_received ?? fee.amount)}</dd></div>
            <div className="flex justify-between"><dt>Método</dt><dd>{fee.payment_method ?? method}</dd></div>
            <div className="flex justify-between"><dt>Competência</dt><dd>{formatCompetence(fee.competence)}</dd></div>
            <div className="flex justify-between"><dt>Recibo</dt><dd>RC-{fee.id.slice(-8).toUpperCase()}</dd></div>
          </dl>
        </Card>
        {financialHistory}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => router.push("/mensalidades")}>Voltar às mensalidades</Button>
          <Button variant="secondary" onClick={() => router.push(`/membros/${member.id}`)}>
            Ver membro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <p className="text-sm text-navy/60">{member.full_name}</p>
        <h1 className="font-display text-2xl text-navy">{formatCompetence(fee.competence)}</h1>
      </div>
      <Card>
        <p className="text-sm text-navy/55">Valor</p>
        <p className="font-display text-3xl text-navy">{formatCurrency(fee.amount)}</p>
        <p className="mt-2 text-sm text-navy/65">Vencimento: {formatDate(fee.due_date)}</p>
      </Card>
      {financialHistory}
      <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-amber-900">
        Cobrança demonstrativa. Nenhuma transação bancária real será realizada.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant={method === "PIX" ? "gold" : "secondary"} onClick={openPix}>PIX</Button>
        <Button variant={method === "BOLETO" ? "gold" : "secondary"} onClick={openBoleto}>BOLETO</Button>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      {pix ? (
        <Card className="space-y-4">
          <CardTitle>PIX demonstrativo</CardTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pix.qrCodeDataUrl} alt="QR Code PIX demonstrativo" className="mx-auto h-52 w-52 rounded-2xl border border-navy/10" />
          <div>
            <p className="mb-2 text-xs text-navy/55">Código Copia e Cola</p>
            <p className="break-all rounded-2xl bg-mist p-3 text-xs text-navy/80">{pix.copyPaste}</p>
          </div>
          <Button className="w-full" onClick={copyPix}><Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copiar PIX"}</Button>
        </Card>
      ) : null}
      {boleto ? (
        <Card className="space-y-3">
          <CardTitle>Boleto demonstrativo</CardTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-navy/55">Beneficiário</dt><dd className="text-right">{boleto.beneficiary}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-navy/55">Pagador</dt><dd>{boleto.payer}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-navy/55">Valor</dt><dd>{formatCurrency(boleto.amount)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-navy/55">Vencimento</dt><dd>{formatDate(boleto.dueDate)}</dd></div>
            <div><dt className="text-navy/55">Código</dt><dd className="mt-1 break-all font-mono text-xs">{boleto.digitableLine}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-navy/55">Status</dt><dd>{boleto.status}</dd></div>
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => window.print()}>Visualizar boleto</Button>
            <Button className="flex-1" onClick={downloadBoleto}><Download className="h-4 w-4" /> Baixar boleto</Button>
          </div>
        </Card>
      ) : null}
      {isDemo && method ? (
        <Button className="w-full" variant="gold" onClick={simulatePay}>Simular pagamento</Button>
      ) : null}
      <p className="text-xs text-navy/45">
        Integração real: substitua MockPaymentProvider em services/payments por API oficial no backend.
        Ref: {uid("ref")}
      </p>
    </div>
  );
}