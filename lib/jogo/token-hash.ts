import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Token bruto entregue somente ao visitante (nunca persistir no banco). */
export function createRawJogoAccessToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

/** SHA-256 hex — valor armazenado em public_access_token_hash / guest_session_token_hash. */
export function hashJogoToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
