"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { chatListTime } from "@/components/chat/chat-room";
import { UserAvatar } from "@/components/profile/user-avatar";
import { messagePreview } from "@/lib/chat";
import { ensureClientsFromMessages } from "@/lib/supabase/chat";
import type { AppNotification, Client, Message } from "@/types";
import { cn } from "@/lib/utils";

export type ChatThread = {
  clientId: string;
  client: Client;
  last?: Message;
  unread: number;
};

type Props = {
  messages: Message[];
  clients: Client[];
  notifications?: AppNotification[];
  hiddenIds?: Set<string>;
  activeId?: string | null;
  hrefFor: (clientId: string) => string;
  onHide?: (clientId: string) => void;
  title?: string;
  subtitle?: string;
  className?: string;
  /** clientId → URL da foto (perfil do cliente) */
  avatarByClientId?: Record<string, string | undefined>;
  /** Só mostra quem já tem mensagem */
  onlyWithMessages?: boolean;
};

export function buildThreads(input: {
  messages: Message[];
  clients: Client[];
  notifications?: AppNotification[];
  hiddenIds?: Set<string>;
  onlyWithMessages?: boolean;
}): ChatThread[] {
  const clients = ensureClientsFromMessages(input.clients, input.messages);
  const hidden = input.hiddenIds ?? new Set<string>();
  const ids = input.onlyWithMessages
    ? Array.from(new Set(input.messages.map((m) => m.client_id)))
    : Array.from(
        new Set([
          ...input.messages.map((m) => m.client_id),
          ...clients.map((c) => c.id),
        ]),
      );

  return ids
    .map((clientId) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client || hidden.has(clientId)) return null;
      const msgs = input.messages
        .filter((m) => m.client_id === clientId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = msgs[msgs.length - 1];
      const unread = (input.notifications ?? []).filter(
        (n) => !n.read && n.type === "chat" && n.related_id === clientId,
      ).length;
      return { clientId, client, last, unread };
    })
    .filter(Boolean)
    .sort((a, b) =>
      (b!.last?.created_at ?? "").localeCompare(a!.last?.created_at ?? ""),
    ) as ChatThread[];
}

export function ConversationListPanel({
  messages,
  clients,
  notifications,
  hiddenIds,
  activeId,
  hrefFor,
  onHide,
  title = "Conversas",
  subtitle,
  className,
  avatarByClientId,
  onlyWithMessages = true,
}: Props) {
  const [q, setQ] = useState("");
  const threads = useMemo(
    () =>
      buildThreads({
        messages,
        clients,
        notifications,
        hiddenIds,
        onlyWithMessages,
      }),
    [messages, clients, notifications, hiddenIds, onlyWithMessages],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((t) => t.client.full_name.toLowerCase().includes(query));
  }, [threads, q]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-r border-navy/10 bg-[#f0f2f5]",
        className,
      )}
    >
      <div className="shrink-0 bg-navy px-4 py-3 text-white">
        <h1 className="font-display text-2xl tracking-wide">{title}</h1>
        {subtitle ? <p className="text-xs text-white/65">{subtitle}</p> : null}
      </div>


      <div className="shrink-0 border-b border-navy/10 bg-[#f0f2f5] px-3 py-2">
        <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-navy/70 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-navy/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar ou começar uma conversa"
            className="w-full bg-transparent outline-none placeholder:text-navy/40"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {filtered.map(({ client, last, clientId, unread }) => {
          const active = activeId === clientId;
          return (
            <div
              key={clientId}
              className={cn(
                "group flex items-stretch border-b border-navy/5",
                active ? "bg-[#e8eef5]" : "hover:bg-[#f5f6f6]",
              )}
            >
              <Link
                href={hrefFor(clientId)}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3"
              >
                <UserAvatar
                  name={client.full_name}
                  src={avatarByClientId?.[clientId]}
                  size="sm"
                  className="h-12 w-12 shrink-0"
                />
                <div className="min-w-0 flex-1 border-b-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[16px] font-medium text-navy">
                      {client.full_name}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        unread ? "font-semibold text-leaf" : "text-navy/45",
                      )}
                    >
                      {chatListTime(last?.created_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-[13px] text-navy/55">
                      {messagePreview(last)}
                    </p>
                    {unread > 0 ? (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-leaf px-1.5 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
              {onHide ? (
                <button
                  type="button"
                  aria-label="Remover da lista"
                  className="flex w-10 shrink-0 items-center justify-center text-navy/25 opacity-0 transition group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                  onClick={() => onHide(clientId)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-navy/50">
            Nenhuma conversa ainda.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
