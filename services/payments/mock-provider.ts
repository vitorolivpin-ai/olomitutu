import { uid } from "@/lib/utils";
import type { BoletoPayment, PaymentProvider, PaymentResult, PixPayment } from "./types";

const store = new Map<string, PaymentResult>();

function demoQr(value: number) {
  const label = encodeURIComponent(`PIX DEMO R$ ${value.toFixed(2)}`);
  // Simple SVG QR placeholder — not a real QR payload
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <rect width="220" height="220" fill="#fff"/>
  <rect x="12" y="12" width="56" height="56" fill="#0B1F3A"/>
  <rect x="152" y="12" width="56" height="56" fill="#0B1F3A"/>
  <rect x="12" y="152" width="56" height="56" fill="#0B1F3A"/>
  <rect x="80" y="80" width="60" height="60" fill="#C9A227"/>
  <text x="110" y="205" text-anchor="middle" font-size="11" fill="#0B1F3A" font-family="sans-serif">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function demoPixCode(amount: number, id: string) {
  return `00020126580014BR.GOV.BCB.PIX0136${id}520400005303986540${amount.toFixed(2)}5802BR5925ILE OLOROKE ASE DEMO6009SAO PAULO62070503***6304DEMO`;
}

export class MockPaymentProvider implements PaymentProvider {
  async createPix(input: {
    amount: number;
    dueDate: string;
    payerName: string;
    description?: string;
  }): Promise<PixPayment> {
    const id = uid("pix");
    const payment: PixPayment = {
      id,
      method: "PIX",
      amount: input.amount,
      dueDate: input.dueDate,
      status: "pending",
      qrCodeDataUrl: demoQr(input.amount),
      copyPaste: demoPixCode(input.amount, id),
      demo: true,
    };
    store.set(id, payment);
    return payment;
  }

  async createBoleto(input: {
    amount: number;
    dueDate: string;
    payerName: string;
    beneficiary?: string;
    description?: string;
  }): Promise<BoletoPayment> {
    const id = uid("bol");
    const payment: BoletoPayment = {
      id,
      method: "BOLETO",
      amount: input.amount,
      dueDate: input.dueDate,
      status: "pending",
      beneficiary: input.beneficiary ?? "ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ",
      payer: input.payerName,
      digitableLine: "23793.38128 60000.000003 00000.000400 1 84370000008000",
      demo: true,
    };
    store.set(id, payment);
    return payment;
  }

  async getPayment(id: string) {
    return store.get(id) ?? null;
  }

  async cancelPayment(id: string) {
    const current = store.get(id);
    if (!current) return null;
    const updated = { ...current, status: "cancelled" as const };
    store.set(id, updated);
    return updated;
  }

  async simulatePayment(id: string) {
    const current = store.get(id);
    if (!current) return null;
    const updated = { ...current, status: "paid" as const };
    store.set(id, updated);
    return updated;
  }
}
