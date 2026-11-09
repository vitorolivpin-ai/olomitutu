"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import {
  loadGuestChatSession,
  saveGuestChatSession,
  type GuestChatSession,
} from "@/lib/guest-chat-session";
import { loadGuestJogoSession } from "@/lib/guest-jogo-session";
import { visitorAccessPath } from "@/lib/jogo";

/**
 * Chat Visitante ↔ Pai — liberado somente após aprovação do Jogo.
 * Admin / Financeiro / outros visitantes não participam.
 */
export default function MarcarChatPage() {
  const { state, sendGuestMessage, resolveJogoAccess } = useAppStore();
  const [session, setSession] = useState<GuestChatSession | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [accessHref, setAccessHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const chat = loadGuestChatSession();
      const jogo = loadGuestJogoSession();
      if (chat) {
        setSession(chat);
        setFullName(chat.fullName);
        setPhone(chat.phone);
      }
      if (jogo?.accessToken) {
        const entry = await resolveJogoAccess(jogo.accessToken);
        if (cancelled) return;
        if (entry?.chat_unlocked) {
          setUnlocked(true);
          setAccessHref(visitorAccessPath(jogo.accessToken));
          if (!chat && jogo.clientId) {
            const next: GuestChatSession = {
              clientId: jogo.clientId,
              fullName: jogo.fullName || "Visitante",
              phone: jogo.phone || "",
              fichaCode: jogo.fichaCode,
            };
            saveGuestChatSession(next);
            setSession(next);
          }
        }
      } else if (jogo?.jogoStatus === "confirmado" && jogo.accessToken) {
        setAccessHref(visitorAccessPath(jogo.accessToken));
      }
      if (!cancelled) setReady(true);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [resolveJogoAccess]);

  const pai = state.profiles.find((p) => p.role === "pai_de_santo");
  const paiName = "Vitor Cardozo - Ògún Yande";

  const messages = useMemo(() => {
    if (!session) return [];
    return (state.messages ?? []).filter((m) => m.client_id === session.clientId);
  }, [state.messages, session]);

  async function onStart(e: FormEvent) {
    e.preventDefault();
    setError("");
    const jogo = loadGuestJogoSession();
    if (!jogo?.accessToken) {
      setError(
        "O chat do Jogo libera após a aprovação do Pai de Santo. Use o link do e-mail.",
      );
      return;
    }
    const entry = await resolveJogoAccess(jogo.accessToken);
    if (!entry?.chat_unlocked) {
      setError("Este atendimento ainda não liberou o chat.");
      return;
    }
    if (fullName.trim().length < 3 || phone.trim().length < 8) {
      setError("Informe nome e WhatsApp.");
      return;
    }
    const next: GuestChatSession = {
      clientId: jogo.clientId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      fichaCode: jogo.fichaCode,
    };
    saveGuestChatSession(next);
    setSession(next);
    setUnlocked(true);
  }

  if (!ready) {
    return <p className="p-8 text-center text-sm text-navy/50">Carregando…</p>;
  }

  if (!unlocked || !session) {
    return (
      <div className="relative min-h-dvh overflow-x-hidden bg-background px-5 py-6 sm:px-6">
        <BrandWatermarks />
        <div className="relative z-10 mx-auto max-w-md space-y-5 pb-28">
          <BrandPageHeader
            title="Chat do Jogo"
            subtitle="Visitante ↔ Pai de Santo · após aprovação"
            backHref="/marcar"
            backLabel="Voltar"
          />

          <Card>
            <CardTitle>Chat liberado só após confirmação</CardTitle>
            <p className="mt-2 text-sm text-navy/65">
              Administrador e Financeiro não acessam esta conversa. Outros visitantes
              também não.
            </p>
            {accessHref ? (
              <Link href={accessHref} className="mt-3 inline-block text-sm font-semibold text-gold-deep">
                Abrir meu atendimento →
              </Link>
            ) : null}
            <form onSubmit={onStart} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="chat-nome">Nome</Label>
                <Input
                  id="chat-nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="chat-phone">WhatsApp</Label>
                <Input
                  id="chat-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              {error ? <ErrorMessage message={error} /> : null}
              <Button type="submit" variant="gold" className="w-full min-h-11">
                Entrar no chat autorizado
              </Button>
            </form>
          </Card>

          <div className="space-y-2 text-center text-sm text-navy/50">
            <button
              type="button"
              className="block w-full min-h-11 underline"
              onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
            >
              Dúvidas antes da aprovação? WhatsApp (último caso)
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
              ? `Jogo pelo chat · ${session.fichaCode}`
              : "Jogo pelo chat do app"
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
            /* Etapa futura: WebRTC. Mantém registro sem abrir plataforma externa obrigatória. */
            sendGuestMessage({
              client_id: session.clientId,
              guest_name: session.fullName,
              kind: "call",
              body: "Chamada será liberada no horário do atendimento (etapa futura).",
            });
          }}
          placeholder="Mensagem para Vitor Cardozo…"
        />
      </div>
    </div>
  );
}
