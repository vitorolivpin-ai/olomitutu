const KEY = "ile-oloroke-guest-chat-v1";

export type GuestChatSession = {
  clientId: string;
  fullName: string;
  phone: string;
  fichaCode?: string;
};

export function loadGuestChatSession(): GuestChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    localStorage.removeItem(KEY);
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestChatSession;
    if (!parsed?.clientId || !parsed.fullName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGuestChatSession(session: GuestChatSession) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearGuestChatSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
