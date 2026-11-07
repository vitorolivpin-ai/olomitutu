"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChatRoom } from "@/components/chat/chat-room";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { PublicBottomNav } from "@/components/hub/public-bottom-nav";
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
  const paiName = "Vitor Cardozo - Ògún Yande";

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
      <div className="relative min-h-dvh overflow-x-hidden bg-[#F7F8FA] px-5 py-6 sm:px-6">
        <BrandWatermarks />
        <div className="relative z-10 mx-auto max-w-md space-y-5 pb-28">
          <BrandPageHeader
            title="Chat"
            subtitle="Vitor Cardozo - Ògún Yande · sem criar conta"
            backHref="/marcar"
            backLabel="Voltar à agenda"
            priority
          />

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

          <div className="space-y-2 text-center text-sm text-navy/50">
            <button
              type="button"
              className="block w-full underline"
              onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
            >
              Dúvidas? WhatsApp (último caso)
            </button>
            <button
              type="button"
              className="block w-full underline"
              onClick={() => openWhatsApp(CLIENT_WHATSAPP.grupo.href)}
            >
              Grupo · {CLIENT_WHATSAPP.grupo.label}
            </button>
          </div>

        </div>
        <PublicBottomNav />
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
          placeholder="Mensagem para Vitor Cardozo…"
        />
      </div>
      <div className="shrink-0 space-y-1 border-t border-navy/10 bg-white px-3 py-2 text-center">
        <button
          type="button"
          className="block w-full text-xs text-navy/45 underline"
          onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
        >
          Dúvidas? Abrir WhatsApp
        </button>
        <button
          type="button"
          className="block w-full text-xs text-navy/45 underline"
          onClick={() => openWhatsApp(CLIENT_WHATSAPP.grupo.href)}
        >
          Entrar no grupo
        </button>
      </div>
    </div>
  );
}
