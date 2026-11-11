import { createHmac, timingSafeEqual } from "crypto";
import { getGoogleOAuthConfig } from "@/lib/google/config";

export type GoogleOAuthStatePayload = {
  uid: string;
  n: number;
};

function hmacKey() {
  const { clientSecret } = getGoogleOAuthConfig();
  return clientSecret || "gcal-oauth-fallback";
}

/** State OAuth assinado (uid + timestamp) — sobrevive sem cookie no celular. */
export function signGoogleOAuthState(payload: GoogleOAuthStatePayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", hmacKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGoogleOAuthState(
  state: string,
  maxAgeMs = 15 * 60_000,
): GoogleOAuthStatePayload | null {
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = createHmac("sha256", hmacKey()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      uid?: string;
      n?: number;
    };
    if (!parsed.uid || typeof parsed.n !== "number") return null;
    if (Date.now() - parsed.n > maxAgeMs) return null;
    return { uid: parsed.uid, n: parsed.n };
  } catch {
    return null;
  }
}
