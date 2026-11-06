"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/hooks/use-app-store";
import { isFinanceMessage } from "@/lib/chat";
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
  const isFinanceChat = currentUser?.role === "tesouraria";
  const isClient = currentUser?.role === "cliente";

  useEffect(() => {
    if (!ready) return;
    if (!isStaffChat && !isFinanceChat && !isClient) return;
    void registerChatServiceWorker();
  }, [ready, isStaffChat, isFinanceChat, isClient]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    if (!isStaffChat && !isFinanceChat && !isClient) return;

    const seen = loadSeen();
    const relevant = (state.messages ?? []).filter((m) => {
      if (!m.id) return false;
      if (isFinanceChat) {
        return m.sender_role === "cliente" && isFinanceMessage(m);
      }
      if (isStaffChat) {
        return m.sender_role === "cliente" && !isFinanceMessage(m);
      }
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
      // Ao abrir o app: se já há mensagem após “excluir da lista”, desarquiva
      if (isStaffChat) syncStaffChatVisibility();
      return;
    }

    const fresh = relevant.filter((m) => !seen.has(m.id));
    if (fresh.length === 0) {
      if (isStaffChat) syncStaffChatVisibility();
      return;
    }

    for (const m of fresh) seen.add(m.id);
    saveSeen(seen);

    const newest = fresh.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    // Nova mensagem → conversa volta à lista do Pai se tinha sido excluída
    if (isStaffChat) {
      unhideStaffChat(newest.client_id);
      syncStaffChatVisibility();
    }

    if (
      (isStaffChat || isFinanceChat) &&
      pathname?.startsWith(`/conversas/${newest.client_id}`)
    ) {
      return;
    }
    if (isClient && pathname === "/cliente/mensagens") return;
    if (isClient && pathname === "/cliente/financeiro-chat") return;

    const financeMsg =
      newest.recipient_role === "tesouraria" || newest.sender_role === "tesouraria";
    void showLocalChatNotification({
      title: isClient
        ? financeMsg
          ? "Mensagem do Financeiro"
          : "Mensagem do Pai"
        : isFinanceChat
          ? "Compra — nova mensagem"
          : "Nova mensagem",
      body: `${newest.sender_name}: ${newest.body}`.slice(0, 140),
      url: isClient
        ? financeMsg
          ? "/cliente/financeiro-chat"
          : "/cliente/mensagens"
        : `/conversas/${newest.client_id}`,
      tag: `chat-${newest.client_id}-${financeMsg ? "fin" : "casa"}`,
    });
  }, [
    ready,
    currentUser,
    state.messages,
    pathname,
    isStaffChat,
    isFinanceChat,
    isClient,
    unhideStaffChat,
    syncStaffChatVisibility,
  ]);

  return null;
}
