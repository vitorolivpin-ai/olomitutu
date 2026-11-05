export type PixPayment = {
  id: string;
  method: "PIX";
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "cancelled";
  qrCodeDataUrl: string;
  copyPaste: string;
  demo: true;
};

export type BoletoPayment = {
  id: string;
  method: "BOLETO";
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "cancelled";
  beneficiary: string;
  payer: string;
  digitableLine: string;
  demo: true;
};

export type PaymentResult = PixPayment | BoletoPayment;

export interface PaymentProvider {
  createPix(input: {
    amount: number;
    dueDate: string;
    payerName: string;
    description?: string;
  }): Promise<PixPayment>;
  createBoleto(input: {
    amount: number;
    dueDate: string;
    payerName: string;
    beneficiary?: string;
    description?: string;
  }): Promise<BoletoPayment>;
  getPayment(id: string): Promise<PaymentResult | null>;
  cancelPayment(id: string): Promise<PaymentResult | null>;
  simulatePayment?(id: string): Promise<PaymentResult | null>;
}
