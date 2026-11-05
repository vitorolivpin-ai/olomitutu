import type { StockLot, StockProduct } from "@/types";

export function daysUntilExpiry(expiresAt: string, now = new Date()) {
  const end = new Date(`${expiresAt}T23:59:59`);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function lotStatus(expiresAt: string, quantity: number) {
  if (quantity <= 0) return "zerado" as const;
  const days = daysUntilExpiry(expiresAt);
  if (days < 0) return "vencido" as const;
  if (days <= 30) return "proximo" as const;
  return "ok" as const;
}

export function productTotalQty(productId: string, lots: StockLot[]) {
  return lots
    .filter((l) => l.product_id === productId && l.quantity > 0)
    .reduce((sum, l) => sum + l.quantity, 0);
}

export function findProductByBarcode(products: StockProduct[], barcode: string) {
  const code = barcode.trim();
  return products.find((p) => p.barcode === code) ?? null;
}

/** Para saída: prioriza lotes que vencem antes (FEFO) */
export function pickLotsForWithdrawal(lots: StockLot[], productId: string, quantity: number) {
  const available = lots
    .filter((l) => l.product_id === productId && l.quantity > 0)
    .slice()
    .sort((a, b) => a.expires_at.localeCompare(b.expires_at));

  let remaining = quantity;
  const plan: Array<{ lot: StockLot; take: number }> = [];

  for (const lot of available) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    plan.push({ lot, take });
    remaining -= take;
  }

  return { ok: remaining === 0, remaining, plan };
}
