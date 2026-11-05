import { MockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./types";

/**
 * Camada desacoplada de pagamentos.
 * Troque MockPaymentProvider por um provedor bancário oficial (backend)
 * sem alterar a interface das telas.
 *
 * Integração real deve entrar aqui e/ou em API routes do Next.js,
 * nunca com credenciais secretas no frontend.
 */
let provider: PaymentProvider = new MockPaymentProvider();

export function getPaymentProvider() {
  return provider;
}

export function setPaymentProvider(next: PaymentProvider) {
  provider = next;
}

export * from "./types";
export { MockPaymentProvider } from "./mock-provider";
