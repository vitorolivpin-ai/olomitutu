"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/hooks/use-app-store";
import {
  registerChatServiceWorker,
  showLocalChatNotification,
} from "@/lib/push-client";

const SEEN_KEY = "ile-chat-seen-ids";

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  try {
    const trimmed = Array.from(ids).slice(-200);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

/** Alerta no celular ao chegar mensagem (Pai ← cliente e Cliente ← casa). */
export function ChatAlertWatcher() {
  const { currentUser, state, ready, syncStaffChatVisibility, unhideStaffChat } =
    useAppStore();
  const pathname = usePathname();
  const primed = useRef(false);

  const isStaffChat =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";
  const isClient = currentUser?.role === "cliente";

  useEffect(() => {
    if (!ready) return;
    if (!isStaffChat && !isClient) return;
    void registerChatServiceWorker();
  }, [ready, isStaffChat, isClient]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    if (!isStaffChat && !isClient) return;

    const seen = loadSeen();
    const relevant = (state.messages ?? []).filter((m) => {
      if (!m.id) return false;
      if (isStaffChat) return m.sender_role === "cliente";
      return (
        m.sender_role !== "cliente" &&
        Boolean(currentUser.client_id) &&
        m.client_id === currentUser.client_id
      );
    });

    if (!primed.current) {
      for (const m of relevant) seen.add(m.id);
      saveSeen(seen);
      primed.current = true;
      return;
    }

    const fresh = relevant.filter((m) => !seen.has(m.id));
    if (fresh.length === 0) return;

    for (const m of fresh) seen.add(m.id);
    saveSeen(seen);

    const newest = fresh.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    // Nova mensagem → conversa volta à lista do Pai se tinha sido excluída
    if (isStaffChat) {
      unhideStaffChat(newest.client_id);
      syncStaffChatVisibility();
    }

    if (isStaffChat && pathname?.startsWith(`/conversas/${newest.client_id}`)) return;
    if (isClient && pathname === "/cliente/mensagens") return;

    void showLocalChatNotification({
      title: isClient ? "Mensagem do Pai" : "Nova mensagem",
      body: `${newest.sender_name}: ${newest.body}`.slice(0, 140),
      url: isClient ? "/cliente/mensagens" : `/conversas/${newest.client_id}`,
      tag: `chat-${newest.client_id}`,
    });
  }, [
    ready,
    currentUser,
    state.messages,
    pathname,
    isStaffChat,
    isClient,
    unhideStaffChat,
    syncStaffChatVisibility,
  ]);

  return null;
}
