import { NextRequest, NextResponse } from "next/server";
import type { FeeReceipt } from "@/types";

function formatMoney(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function receiptHtml(receipt: FeeReceipt) {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Comprovante ${receipt.number}</title></head>
<body style="font-family:Georgia,serif;color:#0B1F3A;background:#f7f4ef;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5dfd3;border-radius:16px;padding:28px">
    <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#C9A227">ILÉ OLÓRÒKÈ ÀṢẸ</p>
    <h1 style="margin:8px 0 4px;font-size:24px">Comprovante de mensalidade</h1>
    <p style="margin:0 0 20px;color:#5a6b7d;font-size:14px">Recibo ${receipt.number}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#5a6b7d">Pagador</td><td style="padding:8px 0;text-align:right"><strong>${receipt.payer_name}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#5a6b7d">Competência</td><td style="padding:8px 0;text-align:right">${receipt.competence}</td></tr>
      <tr><td style="padding:8px 0;color:#5a6b7d">Valor</td><td style="padding:8px 0;text-align:right"><strong>R$ ${formatMoney(receipt.amount)}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#5a6b7d">Método</td><td style="padding:8px 0;text-align:right">${receipt.payment_method}</td></tr>
      <tr><td style="padding:8px 0;color:#5a6b7d">Pago em</td><td style="padding:8px 0;text-align:right">${new Date(receipt.paid_at).toLocaleString("pt-BR")}</td></tr>
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#8a96a3">Documento interno da casa. Não substitui nota fiscal oficial quando exigida por lei.</p>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let body: { to?: string; receipt?: FeeReceipt };
  try {
    body = (await req.json()) as { to?: string; receipt?: FeeReceipt };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const to = body.to?.trim();
  const receipt = body.receipt;
  if (!to || !receipt?.number) {
    return NextResponse.json(
      { ok: false, error: "Informe destinatário e recibo." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Olomitutu <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error:
        "E-mail não configurado (RESEND_API_KEY). O comprovante ficou disponível no app.",
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Comprovante ${receipt.number} — mensalidade ${receipt.competence}`,
      html: receiptHtml(receipt),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { ok: false, error: text || `Resend HTTP ${res.status}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
