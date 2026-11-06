"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChatRoom } from "@/components/chat/chat-room";
import { BrandMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { CLIENT_WHATSAPP, openWhatsApp } from "@/lib/client-whatsapp";
import { videoCallRoomUrl } from "@/lib/chat";
import {
  loadGuestChatSession,
  saveGuestChatSession,
  type GuestChatSession,
} from "@/lib/guest-chat-session";

/** Chat com o Pai na marcação — sem criar conta. */
export default function MarcarChatPage() {
  const { state, ensureGuestChatClient, sendGuestMessage } = useAppStore();
  const [session, setSession] = useState<GuestChatSession | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadGuestChatSession();
    if (saved) {
      setSession(saved);
      setFullName(saved.fullName);
      setPhone(saved.phone);
    }
    setReady(true);
  }, []);

  const pai =
    state.profiles.find((p) => p.role === "pai_de_santo") ??
    state.profiles.find((p) => p.role === "administrador");
  const paiName = pai?.full_name?.trim() || "Pai de Santo";

  const messages = useMemo(() => {
    if (!session) return [];
    return (state.messages ?? []).filter((m) => m.client_id === session.clientId);
  }, [state.messages, session]);

  function onStart(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = ensureGuestChatClient({ full_name: fullName, phone });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const next: GuestChatSession = {
      clientId: result.client_id,
      fullName: fullName.trim(),
      phone: phone.trim(),
    };
    saveGuestChatSession(next);
    setSession(next);
  }

  if (!ready) {
    return <p className="p-8 text-center text-sm text-navy/50">Carregando…</p>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-app px-4 py-8">
        <div className="mx-auto max-w-md space-y-5">
          <div className="flex items-center gap-4">
            <BrandMark className="h-14 w-14 shrink-0" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gold-deep">
                Marcação
              </p>
              <h1 className="font-display text-2xl text-navy">Chat com o Pai</h1>
              <p className="text-sm text-navy/55">Sem criar conta — só nome e telefone.</p>
            </div>
          </div>

          <Card>
            <CardTitle>Identifique-se para o chat</CardTitle>
            <form onSubmit={onStart} className="mt-4 space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              {error ? <ErrorMessage message={error} /> : null}
              <Button type="submit" variant="gold" className="w-full">
                Abrir chat
              </Button>
            </form>
          </Card>

          <button
            type="button"
            className="w-full text-center text-sm text-navy/50 underline"
            onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
          >
            Dúvidas? WhatsApp (último caso)
          </button>

          <p className="text-center text-sm">
            <Link href="/marcar" className="text-navy/55 underline">
              ← Voltar à marcação
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col bg-[#d1d7db]">
      <div className="min-h-0 flex-1">
        <ChatRoom
          title={paiName}
          subtitle={
            session.fichaCode
              ? `Marcação · ${session.fichaCode}`
              : "Chat da marcação do jogo"
          }
          backHref="/marcar"
          avatarName={paiName}
          avatarSrc={pai?.avatar_url}
          messages={messages}
          isMine={(msg) => msg.sender_role === "cliente"}
          onSendText={(body) =>
            sendGuestMessage({
              client_id: session.clientId,
              guest_name: session.fullName,
              body,
            })
          }
          onSendAudio={(payload) =>
            sendGuestMessage({
              client_id: session.clientId,
              guest_name: session.fullName,
              kind: "audio",
              audio_data_url: payload.dataUrl,
              audio_duration_sec: payload.durationSec,
            })
          }
          onSendVideo={(payload) =>
            sendGuestMessage({
              client_id: session.clientId,
              guest_name: session.fullName,
              kind: "video",
              video_data_url: payload.dataUrl,
            })
          }
          onStartCall={() => {
            const url = videoCallRoomUrl(session.clientId);
            sendGuestMessage({
              client_id: session.clientId,
              guest_name: session.fullName,
              kind: "call",
              call_url: url,
              body: "Chamada de vídeo iniciada — toque para entrar.",
            });
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          placeholder="Mensagem para o Pai…"
        />
      </div>
      <div className="shrink-0 border-t border-navy/10 bg-white px-3 py-2 text-center">
        <button
          type="button"
          className="text-xs text-navy/45 underline"
          onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
        >
          Dúvidas? Abrir WhatsApp
        </button>
      </div>
    </div>
  );
}
