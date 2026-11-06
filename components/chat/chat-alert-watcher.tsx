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

/** Quando o Pai está logado, alerta no celular ao chegar mensagem do cliente. */
export function ChatAlertWatcher() {
  const { currentUser, state, ready } = useAppStore();
  const pathname = usePathname();
  const primed = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (currentUser?.role !== "pai_de_santo" && currentUser?.role !== "administrador") {
      return;
    }
    void registerChatServiceWorker();
  }, [ready, currentUser?.role]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    if (currentUser.role !== "pai_de_santo" && currentUser.role !== "administrador") {
      return;
    }

    const seen = loadSeen();
    const fromClients = (state.messages ?? []).filter(
      (m) => m.sender_role === "cliente" && m.id,
    );

    if (!primed.current) {
      for (const m of fromClients) seen.add(m.id);
      saveSeen(seen);
      primed.current = true;
      return;
    }

    const fresh = fromClients.filter((m) => !seen.has(m.id));
    if (fresh.length === 0) return;

    for (const m of fresh) seen.add(m.id);
    saveSeen(seen);

    // Se já está dentro da conversa desse cliente, não dispara alerta
    const newest = fresh.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (pathname?.startsWith(`/conversas/${newest.client_id}`)) return;

    void showLocalChatNotification({
      title: "Nova mensagem",
      body: `${newest.sender_name}: ${newest.body}`.slice(0, 140),
      url: `/conversas/${newest.client_id}`,
      tag: `chat-${newest.client_id}`,
    });
  }, [ready, currentUser, state.messages, pathname]);

  return null;
}
