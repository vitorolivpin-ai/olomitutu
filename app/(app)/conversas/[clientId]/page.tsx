"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send } from "lucide-react";
import { AudioRecorder } from "@/components/chat/audio-recorder";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { canAccess } from "@/lib/permissions";

export default function ChatPage() {
  const params = useParams<{ clientId: string }>();
  const { state, currentUser, sendMessage, addInternalNote } = useAppStore();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const client = state.clients.find((c) => c.id === params.clientId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, params.clientId]);

  if (!canAccess(currentUser?.role, "chat")) {
    return <EmptyState title="Acesso negado às conversas" />;
  }
  if (!client) return <EmptyState title="Cliente não encontrado" />;

  const currentClient = client;

  if (currentUser?.role === "cliente" && currentUser.client_id !== currentClient.id) {
    return <EmptyState title="Acesso negado" />;
  }

  const messages = state.messages
    .filter((m) => m.client_id === currentClient.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const notes = state.internalNotes.filter((n) => n.client_id === currentClient.id);
  const canNotes = canAccess(currentUser?.role, "internal_notes");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (internal && canNotes) {
      addInternalNote(currentClient.id, body.trim());
    } else {
      sendMessage({ client_id: currentClient.id, body: body.trim() });
    }
    setBody("");
  }

  function onSendAudio(payload: { dataUrl: string; durationSec: number }) {
    if (internal) return;
    sendMessage({
      client_id: currentClient.id,
      kind: "audio",
      audio_data_url: payload.dataUrl,
      audio_duration_sec: payload.durationSec,
    });
  }

  return (
    <div className="animate-rise flex min-h-[70vh] flex-col gap-4">
      <div>
        <Link href="/conversas" className="text-sm text-navy/55 hover:text-navy">
          ← Conversas
        </Link>
        <h1 className="font-display text-3xl text-navy">{currentClient.full_name}</h1>
        <p className="text-sm text-navy/55">
          Chat sincronizado com o App do Cliente · texto e áudio
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="max-h-[55vh] flex-1 space-y-3 overflow-y-auto bg-mist/40 p-4">
          {messages.map((msg) => {
            const mine =
              (currentUser?.role === "cliente" && msg.sender_role === "cliente") ||
              (currentUser?.role !== "cliente" && msg.sender_role !== "cliente");
            return <MessageBubble key={msg.id} message={msg} mine={mine} />;
          })}
          {messages.length === 0 ? (
            <p className="text-center text-sm text-navy/55">Comece a conversa.</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="space-y-2 border-t border-navy/10 bg-white p-3">
          {canNotes ? (
            <label className="flex items-center gap-2 text-xs text-navy/70">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
              />
              Anotação interna (não aparece para o cliente)
            </label>
          ) : null}
          <div className="flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder={internal ? "Anotação interna..." : "Mensagem..."}
              className="min-h-12"
            />
            <Button type="submit" className="shrink-0 self-end" aria-label="Enviar">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          {!internal ? (
            <AudioRecorder onSend={onSendAudio} />
          ) : (
            <p className="text-xs text-navy/45">Áudio só nas mensagens do chat (não em anotação interna).</p>
          )}
        </form>
      </Card>

      {canNotes && notes.length > 0 ? (
        <Card>
          <CardTitle>Anotações internas</CardTitle>
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-2xl bg-cream/80 p-3 text-sm">
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-navy/50">
                  {n.author_name} · {formatDateTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
