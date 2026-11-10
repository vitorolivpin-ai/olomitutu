import { createSeedState } from "@/lib/seed";
import type { AppState } from "@/types";

/** Dados compartilhados entre App da Casa e App do Cliente */
export const DATA_KEY = "ile-oloroke-data-v1";
/** Sessão por aba — permite Casa e Cliente abertos ao mesmo tempo */
export const SESSION_KEY = "ile-oloroke-session-v1";
export const PRIVATE_DATA_KEY = "ile-oloroke-private-data-v1";
/** Chave legada (migração) */
const LEGACY_KEY = "ile-oloroke-demo-v1";

export type SharedData = Omit<AppState, "currentUserId">;

export function stripSession(state: AppState): SharedData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { currentUserId: _omit, ...data } = state;
  return data;
}

function withoutPrivateData(data: SharedData): SharedData {
  return {
    ...data,
    profiles: data.profiles.filter((profile) => profile.role !== "cliente"),
    clients: [],
    appointments: [],
    messages: [],
    internalNotes: [],
    shopPurchases: [],
    notifications: data.notifications.filter(
      (notification) => !["chat", "agenda", "atendimento", "financeiro"].includes(notification.type),
    ),
    staffHiddenClientIds: [],
    staffHiddenAt: {},
  };
}

export function loadSharedData(): SharedData {
  if (typeof window === "undefined") return withoutPrivateData(stripSession(createSeedState()));
  try {
    const raw = localStorage.getItem(DATA_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return withoutPrivateData(stripSession(createSeedState()));
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const seed = createSeedState();
    const parsedProfiles = parsed.profiles ?? [];
    const profiles = [
      ...seed.profiles.filter((s) => !parsedProfiles.some((p) => p.id === s.id || p.role === s.role)),
      ...parsedProfiles,
    ];
    const shared = stripSession({
      ...seed,
      ...parsed,
      currentUserId: null,
      clients: [],
      appointments: [],
      messages: [],
      internalNotes: [],
      notifications: parsed.notifications ?? seed.notifications,
      profiles,
      publishedSlots: parsed.publishedSlots ?? seed.publishedSlots,
      availability: parsed.availability ?? seed.availability,
      stockProducts: parsed.stockProducts ?? seed.stockProducts,
      stockLots: parsed.stockLots ?? seed.stockLots,
      stockMovements: parsed.stockMovements ?? seed.stockMovements,
      libraryItems: parsed.libraryItems ?? seed.libraryItems,
      blogPosts: parsed.blogPosts ?? seed.blogPosts,
      educationItems: parsed.educationItems ?? seed.educationItems,
      hierarchyPeople: parsed.hierarchyPeople ?? seed.hierarchyPeople,
      checklistItems: parsed.checklistItems ?? seed.checklistItems,
      checklistProgress: parsed.checklistProgress ?? seed.checklistProgress,
      ajodunEvents: parsed.ajodunEvents ?? seed.ajodunEvents,
      ajodunMemberships: parsed.ajodunMemberships ?? seed.ajodunMemberships ?? [],
      feeReceipts: parsed.feeReceipts ?? seed.feeReceipts ?? [],
      photoAlbums: parsed.photoAlbums ?? seed.photoAlbums,
      shopProducts: (parsed.shopProducts ?? seed.shopProducts).map((p) => ({
        ...p,
        kind: p.kind ?? "fisico",
        requires_payment: p.requires_payment ?? false,
        file_url: p.file_url,
      })),
      shopPurchases: (parsed.shopPurchases ?? seed.shopPurchases ?? []).map((p) => ({
        ...p,
        delivery: p.delivery ?? (p.client_id ? "conta" : "email"),
      })),
      oficinas: (() => {
        const local = parsed.oficinas ?? [];
        const byId = new Map(local.map((o) => [o.id, o]));
        for (const s of seed.oficinas ?? []) {
          if (!byId.has(s.id)) byId.set(s.id, s);
        }
        return [...byId.values()];
      })(),
      inscricoesOficina: parsed.inscricoesOficina ?? seed.inscricoesOficina ?? [],
      houseSettings: {
        ...(seed.houseSettings ?? {}),
        ...(parsed.houseSettings ?? {}),
      },
      jogoSlotHolds: parsed.jogoSlotHolds ?? seed.jogoSlotHolds ?? [],
      jogoAccessIndex: parsed.jogoAccessIndex ?? seed.jogoAccessIndex ?? [],
      staffHiddenClientIds: parsed.staffHiddenClientIds ?? [],
      staffHiddenAt: {
        ...Object.fromEntries(
          (parsed.staffHiddenClientIds ?? []).map((id) => [
            id,
            "1970-01-01T00:00:00.000Z",
          ]),
        ),
        ...(parsed.staffHiddenAt ?? {}),
      },
    });
    const safeShared = withoutPrivateData(shared);
    localStorage.setItem(DATA_KEY, JSON.stringify(safeShared));
    localStorage.removeItem(LEGACY_KEY);
    return safeShared;
  } catch {
    try {
      localStorage.removeItem(DATA_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Storage is unavailable; return the private-data-free seed.
    }
    return withoutPrivateData(stripSession(createSeedState()));
  }
}

type PrivateData = Pick<
  AppState,
  | "clients"
  | "appointments"
  | "messages"
  | "internalNotes"
  | "notifications"
  | "profiles"
  | "shopPurchases"
>;

export function loadPrivateData(userId: string | null): Partial<PrivateData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(PRIVATE_DATA_KEY);
    if (!userId) return {};
    if (!raw) return {};
    const saved = JSON.parse(raw) as { userId?: string; data?: Partial<PrivateData> };
    if (saved.userId !== userId) {
      sessionStorage.removeItem(PRIVATE_DATA_KEY);
      return {};
    }
    return saved.data ?? {};
  } catch {
    return {};
  }
}

export function persistPrivateData(userId: string | null, data?: PrivateData) {
  try {
    if (!userId || !data) {
      sessionStorage.removeItem(PRIVATE_DATA_KEY);
      return;
    }
    sessionStorage.setItem(PRIVATE_DATA_KEY, JSON.stringify({ userId, data }));
  } catch {
    sessionStorage.removeItem(PRIVATE_DATA_KEY);
  }
}

export function persistSharedData(data: SharedData) {
  const safeData = withoutPrivateData(data);
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(safeData));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // QuotaExceeded: remove áudios antigos e tenta de novo
    const pruned: SharedData = {
      ...safeData,
      messages: safeData.messages.map((m, idx, arr) => {
        if (m.kind === "audio" && m.audio_data_url) {
          const newerAudioCount = arr
            .slice(idx + 1)
            .filter((x) => x.kind === "audio" && x.audio_data_url).length;
          if (newerAudioCount >= 8) {
            return { ...m, audio_data_url: undefined, body: m.body || "Áudio (expirado no demo)" };
          }
        }
        if (m.kind === "video" && m.video_data_url) {
          const newerVideoCount = arr
            .slice(idx + 1)
            .filter((x) => x.kind === "video" && x.video_data_url).length;
          if (newerVideoCount >= 4) {
            return { ...m, video_data_url: undefined, body: m.body || "Vídeo (expirado no demo)" };
          }
        }
        return m;
      }),
    };
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(pruned));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // último recurso: remove payloads pesados (áudio chat + arquivos da biblioteca)
      const textOnly: SharedData = {
        ...safeData,
        messages: safeData.messages.map((m) =>
          m.kind === "audio"
            ? { ...m, audio_data_url: undefined, body: m.body || "Áudio" }
            : m,
        ),
        libraryItems: (safeData.libraryItems ?? []).map((item) =>
          item.file_data_url
            ? {
                ...item,
                file_data_url: undefined,
                description:
                  (item.description ? `${item.description} · ` : "") +
                  "Arquivo removido do cache local (limite do navegador). Use link externo.",
              }
            : item,
        ),
      };
      localStorage.setItem(DATA_KEY, JSON.stringify(textOnly));
      localStorage.removeItem(LEGACY_KEY);
    }
  }
}

function readSidCookie(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(/(?:^|; )ile-oloroke-sid=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function loadSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Cookie do login (/api/entrar) manda — evita ficar preso na sessão antiga
    // (ex.: Biblioteca) ao entrar em outra aba
    const fromCookie = readSidCookie();
    if (fromCookie) {
      sessionStorage.setItem(SESSION_KEY, fromCookie);
      return fromCookie;
    }
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function persistSessionUserId(userId: string | null) {
  try {
    if (userId) {
      sessionStorage.setItem(SESSION_KEY, userId);
      document.cookie = `ile-oloroke-sid=${encodeURIComponent(userId)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      document.cookie = "ile-oloroke-sid=; path=/; max-age=0; samesite=lax";
    }
  } catch {
    // ignore
  }
}
