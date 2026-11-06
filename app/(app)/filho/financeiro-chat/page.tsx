"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChatRoom } from "@/components/chat/chat-room";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { messagesForChannel } from "@/lib/chat";
import { isFilhoDeSanto } from "@/lib/filho";

export default function FilhoFinanceiroChatPage() {
  const { state, currentUser, sendMessage, markChatNotificationsRead } =
    useAppStore();
  const clientId = currentUser?.client_id;

  useEffect(() => {
    if (clientId) markChatNotificationsRead(clientId);
  }, [clientId, markChatNotificationsRead]);

  if (!isFilhoDeSanto(currentUser) || !clientId) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  const finance = state.profiles.find((p) => p.role === "tesouraria");
  const messages = messagesForChannel(state.messages ?? [], "financeiro").filter(
    (m) => m.client_id === clientId,
  );
  const title = finance?.full_name?.trim() || "Financeiro";

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#d1d7db]">
      <div className="shrink-0 border-b border-navy/10 bg-white px-3 py-2 text-sm text-navy/60 md:hidden">
        <Link href="/filho/loja" className="underline">
          ← Loja
        </Link>
        <span className="mx-2">·</span>
        Chat sobre mensalidade, Pix e loja
      </div>
      <div className="min-h-0 flex-1">
        <ChatRoom
          title={title}
          subtitle="Financeiro · mensalidade e liberações"
          backHref="/filho/loja"
          avatarName={title}
          avatarSrc={finance?.avatar_url}
          messages={messages}
          isMine={(msg) => msg.sender_role === "cliente"}
          onSendText={(body) =>
            sendMessage({ client_id: clientId, body, channel: "financeiro" })
          }
          onSendAudio={(payload) =>
            sendMessage({
              client_id: clientId,
              kind: "audio",
              audio_data_url: payload.dataUrl,
              audio_duration_sec: payload.durationSec,
              channel: "financeiro",
            })
          }
          onSendVideo={(payload) =>
            sendMessage({
              client_id: clientId,
              kind: "video",
              video_data_url: payload.dataUrl,
              channel: "financeiro",
            })
          }
          placeholder="Dúvida sobre mensalidade, Pix ou loja…"
        />
      </div>
    </div>
  );
}
