"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatRoom } from "@/components/chat/chat-room";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { videoCallRoomUrl } from "@/lib/chat";
import { canAccess } from "@/lib/permissions";
import { ensureClientsFromMessages } from "@/lib/supabase/chat";
import type { Client } from "@/types";

export default function ChatPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const {
    state,
    currentUser,
    sendMessage,
    addInternalNote,
    hideStaffChat,
    refreshCloudChat,
  } = useAppStore();
  const [internal, setInternal] = useState(false);

  useEffect(() => {
    void refreshCloudChat();
  }, [refreshCloudChat, params.clientId]);

  const clients = useMemo(
    () => ensureClientsFromMessages(state.clients ?? [], state.messages ?? []),
    [state.clients, state.messages],
  );

  const client: Client | undefined = clients.find((c) => c.id === params.clientId);

  if (!canAccess(currentUser?.role, "chat")) {
    return <EmptyState title="Acesso negado às conversas" />;
  }

  if (!client) {
    return (
      <EmptyState
        title="Carregando conversa…"
        description="Se a notificação já chegou, aguarde um instante ou volte em Conversas."
      />
    );
  }

  if (currentUser?.role === "cliente" && currentUser.client_id !== client.id) {
    return <EmptyState title="Acesso negado" />;
  }

  const messages = state.messages.filter((m) => m.client_id === client.id);
  const canNotes = canAccess(currentUser?.role, "internal_notes");
  const isStaff = currentUser?.role !== "cliente";

  function startVideoCall() {
    const url = videoCallRoomUrl(client.id);
    sendMessage({
      client_id: client.id,
      kind: "call",
      call_url: url,
      body: "Chamada de vídeo iniciada — toque para entrar.",
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function onHideChat() {
    if (
      !confirm(
        "Remover esta conversa da sua lista? O cliente continua vendo áudios, vídeos e todo o histórico.",
      )
    ) {
      return;
    }
    hideStaffChat(client.id);
    router.push("/conversas");
  }

  return (
    <ChatRoom
      title={client.full_name}
      subtitle="online"
      backHref="/conversas"
      avatarName={client.full_name}
      avatarSrc={null}
      messages={messages}
      isMine={(msg) =>
        (currentUser?.role === "cliente" && msg.sender_role === "cliente") ||
        (currentUser?.role !== "cliente" && msg.sender_role !== "cliente")
      }
      onSendText={(body) => {
        if (internal && canNotes) {
          addInternalNote(client.id, body);
          setInternal(false);
          return;
        }
        sendMessage({ client_id: client.id, body });
      }}
      onSendAudio={(payload) => {
        if (internal) return;
        sendMessage({
          client_id: client.id,
          kind: "audio",
          audio_data_url: payload.dataUrl,
          audio_duration_sec: payload.durationSec,
        });
      }}
      onSendVideo={(payload) => {
        if (internal) return;
        sendMessage({
          client_id: client.id,
          kind: "video",
          video_data_url: payload.dataUrl,
        });
      }}
      onStartCall={startVideoCall}
      onHide={isStaff ? onHideChat : undefined}
      placeholder="Digite uma mensagem"
      composerDisabled={false}
      composerTopSlot={
        canNotes ? (
          <label className="mb-2 flex items-center gap-2 px-1 text-xs text-navy/70">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Anotação interna (só a casa vê)
          </label>
        ) : null
      }
    />
  );
}
