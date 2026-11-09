import type { JogoFlowStatus, JogoModalidade } from "@/types";

const KEY = "ile-oloroke-guest-jogo-v1";

/** Sessão temporária do visitante (sessionStorage) — sem comprovante. */
export type GuestJogoSession = {
  appointmentId: string;
  clientId: string;
  fullName: string;
  phone: string;
  email: string;
  fichaCode: string;
  scheduledAt: string;
  modalidade: JogoModalidade;
  amount: number;
  jogoStatus: JogoFlowStatus;
  accessToken?: string;
  holdExpiresAt?: string;
};

export function loadGuestJogoSession(): GuestJogoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestJogoSession;
    if (!parsed?.appointmentId || !parsed.clientId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGuestJogoSession(session: GuestJogoSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearGuestJogoSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function patchGuestJogoSession(patch: Partial<GuestJogoSession>) {
  const current = loadGuestJogoSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveGuestJogoSession(next);
  return next;
}
