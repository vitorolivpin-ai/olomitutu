"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Video } from "lucide-react";
import { AudioRecorder } from "@/components/chat/audio-recorder";
import { MessageBubble } from "@/components/chat/message-bubble";
import { VideoAttach } from "@/components/chat/video-attach";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { videoCallRoomUrl } from "@/lib/chat";

export default function ClienteMensagensPage() {
  const { state, currentUser, sendMessage } = useAppStore();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const clientId = currentUser?.client_id;

  const messages = state.messages
    .filter((m) => m.client_id === clientId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (currentUser?.role !== "cliente" || !clientId) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !clientId) return;
    sendMessage({ client_id: clientId, body: body.trim() });
    setBody("");
  }

  function onSendAudio(payload: { dataUrl: string; durationSec: number }) {
    if (!clientId) return;
    sendMessage({
      client_id: clientId,
      kind: "audio",
      audio_data_url: payload.dataUrl,
      audio_duration_sec: payload.durationSec,
    });
  }

  function onSendVideo(payload: { dataUrl: string }) {
    if (!clientId) return;
    sendMessage({
      client_id: clientId,
      kind: "video",
      video_data_url: payload.dataUrl,
    });
  }

  function startVideoCall() {
    if (!clientId) return;
    const url = videoCallRoomUrl(clientId);
    sendMessage({
      client_id: clientId,
      kind: "call",
      call_url: url,
      body: "Chamada de vídeo iniciada — toque para entrar.",
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="animate-rise flex min-h-[70vh] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold-deep">Área do cliente</p>
          <h1 className="font-display text-3xl text-navy">Mensagens</h1>
          <p className="text-sm text-navy/60">
            Seu histórico fica guardado aqui (texto, áudio e vídeo), mesmo se a casa limpar a
            lista dela.
          </p>
        </div>
        <Button size="sm" variant="gold" onClick={startVideoCall}>
          <Video className="mr-1.5 h-4 w-4" />
          Chamada de vídeo
        </Button>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="max-h-[55vh] flex-1 space-y-3 overflow-y-auto bg-mist/40 p-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              mine={msg.sender_role === "cliente"}
            />
          ))}
          {messages.length === 0 ? (
            <p className="text-center text-sm text-navy/55">Envie a primeira mensagem.</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="space-y-2 border-t border-navy/10 bg-white p-3">
          <div className="flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Escreva sua mensagem..."
              className="min-h-12"
            />
            <Button type="submit" className="shrink-0 self-end" aria-label="Enviar">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <AudioRecorder onSend={onSendAudio} />
            <VideoAttach onSend={onSendVideo} />
          </div>
        </form>
      </Card>
    </div>
  );
}
