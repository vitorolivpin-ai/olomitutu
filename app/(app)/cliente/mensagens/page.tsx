"use client";

import { useEffect } from "react";
import { ChatRoom } from "@/components/chat/chat-room";
import { ConversationListPanel } from "@/components/chat/conversation-list-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { videoCallRoomUrl } from "@/lib/chat";
import { isClienteDeJogo, isFilhoDeSanto } from "@/lib/filho";
import type { Client } from "@/types";

export default function ClienteMensagensPage() {
  const { state, currentUser, sendMessage, markChatNotificationsRead } =
    useAppStore();
  const clientId = currentUser?.client_id;

  useEffect(() => {
    if (clientId) markChatNotificationsRead(clientId);
  }, [clientId, markChatNotificationsRead]);

  if (
    !currentUser ||
    currentUser.role !== "cliente" ||
    isFilhoDeSanto(currentUser) ||
    !isClienteDeJogo(currentUser) ||
    !clientId
  ) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  const messages = state.messages.filter((m) => m.client_id === clientId);
  const pai =
    state.profiles.find((u) => u.role === "pai_de_santo") ??
    state.profiles.find((u) => u.role === "administrador");
  const paiDisplayName = "Vitor Cardozo - Ògún Yande";

  const paiAsClient: Client = {
    id: "pai-thread",
    full_name: paiDisplayName,
    phone: "—",
    registration_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const listMessages = messages.map((m) => ({ ...m, client_id: "pai-thread" }));

  function startVideoCall() {
    const url = videoCallRoomUrl(clientId!);
    sendMessage({
      client_id: clientId!,
      kind: "call",
      call_url: url,
      body: "Chamada de vídeo iniciada — toque para entrar.",
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const room = (
    <ChatRoom
      title={paiDisplayName}
      subtitle="Casa · ILÉ OLÓRÒKÈ ÀṢẸ"
      backHref="/cliente"
      hideBackOnDesktop
      avatarName={paiDisplayName}
      avatarSrc={pai?.avatar_url}
      messages={messages}
      isMine={(msg) => msg.sender_role === "cliente"}
      onSendText={(body) => sendMessage({ client_id: clientId, body })}
      onSendAudio={(payload) =>
        sendMessage({
          client_id: clientId,
          kind: "audio",
          audio_data_url: payload.dataUrl,
          audio_duration_sec: payload.durationSec,
        })
      }
      onSendVideo={(payload) =>
        sendMessage({
          client_id: clientId,
          kind: "video",
          video_data_url: payload.dataUrl,
        })
      }
      onStartCall={startVideoCall}
      placeholder="Mensagem para Vitor Cardozo…"
    />
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#d1d7db]">
      <div className="hidden h-full w-[38%] max-w-[420px] shrink-0 md:flex md:flex-col">
        <ConversationListPanel
          messages={listMessages}
          clients={[paiAsClient]}
          activeId="pai-thread"
          hrefFor={() => "/cliente/mensagens"}
          title="Conversas"
          subtitle="App do Cliente"
          onlyWithMessages={false}
          className="h-full"
        />
      </div>
      <div className="flex h-full min-w-0 flex-1 flex-col">{room}</div>
    </div>
  );
}
