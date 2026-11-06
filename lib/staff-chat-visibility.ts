import type { Message } from "@/types";

/** clientId → quando a casa ocultou a conversa (ISO). */
export type StaffHiddenMap = Record<string, string>;

const EPOCH = "1970-01-01T00:00:00.000Z";

/** Normaliza lista antiga + mapa de timestamps. */
export function normalizeStaffHidden(
  ids: string[] | undefined,
  at: StaffHiddenMap | undefined,
): StaffHiddenMap {
  const map: StaffHiddenMap = { ...(at ?? {}) };
  for (const id of ids ?? []) {
    if (!map[id]) map[id] = EPOCH;
  }
  return map;
}

export function hideStaffChatInMap(map: StaffHiddenMap, clientId: string, atIso: string) {
  return { ...map, [clientId]: atIso };
}

export function unhideStaffChatInMap(map: StaffHiddenMap, clientId: string) {
  if (!(clientId in map)) return map;
  const next = { ...map };
  delete next[clientId];
  return next;
}

/**
 * Se chegou mensagem (qualquer lado) DEPOIS de ocultar, a conversa volta à lista —
 * igual ao WhatsApp desarquivar com mensagem nova.
 */
export function revealHiddenChatsWithNewerMessages(
  map: StaffHiddenMap,
  messages: Message[],
): StaffHiddenMap {
  const hiddenIds = Object.keys(map);
  if (hiddenIds.length === 0) return map;

  let changed = false;
  const next = { ...map };
  for (const clientId of hiddenIds) {
    const hiddenAt = next[clientId] ?? EPOCH;
    const hasNewer = messages.some(
      (m) => m.client_id === clientId && m.created_at > hiddenAt,
    );
    if (hasNewer) {
      delete next[clientId];
      changed = true;
    }
  }
  return changed ? next : map;
}

export function staffHiddenIdSet(map: StaffHiddenMap) {
  return new Set(Object.keys(map));
}
