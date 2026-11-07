"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Phone, Search, Trash2, Video } from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { MessageBubble } from "@/components/chat/message-bubble";
import { UserAvatar } from "@/components/profile/user-avatar";
import { formatDate, formatTime } from "@/lib/format";
import type { Message } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  /** No desktop WhatsApp Web o voltar some (lista já está à esquerda) */
  hideBackOnDesktop?: boolean;
  avatarName: string;
  avatarSrc?: string | null;
  messages: Message[];
  isMine: (msg: Message) => boolean;
  onSendText: (body: string) => void;
  onSendAudio: (payload: { dataUrl: string; durationSec: number }) => void;
  onSendVideo: (payload: { dataUrl: string }) => void;
  onStartCall?: () => void;
  onHide?: () => void;
  composerTopSlot?: React.ReactNode;
  composerDisabled?: boolean;
  placeholder?: string;
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Hoje";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Ontem";
  return formatDate(iso);
}

export function ChatRoom({
  title,
  subtitle = "toque para ver as informações",
  backHref,
  hideBackOnDesktop = true,
  avatarName,
  avatarSrc,
  messages,
  isMine,
  onSendText,
  onSendAudio,
  onSendVideo,
  onStartCall,
  onHide,
  composerTopSlot,
  composerDisabled,
  placeholder = "Digite uma mensagem",
}: Props) {
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const sorted = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const out: Array<
      { type: "day"; label: string; key: string } | { type: "msg"; message: Message }
    > = [];
    let lastDay = "";
    for (const msg of sorted) {
      const key = dayKey(msg.created_at);
      if (key !== lastDay) {
        out.push({ type: "day", label: dayLabel(msg.created_at), key: `d-${key}` });
        lastDay = key;
      }
      out.push({ type: "msg", message: msg });
    }
    return out;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    onSendText(text);
    setBody("");
  }

  return (
    <div className="chat-immersive flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-black/10 bg-navy px-2 py-2 text-white shadow-sm">
        {backHref ? (
          <Link
            href={backHref}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10",
              hideBackOnDesktop && "md:hidden",
            )}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <UserAvatar
          name={avatarName}
          src={avatarSrc}
          size="sm"
          className="h-10 w-10 ring-1 ring-white/20"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium leading-tight">{title}</p>
          <p className="truncate text-[12px] text-white/65">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center">
          {onStartCall ? (
            <>
              <button
                type="button"
                onClick={onStartCall}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
                aria-label="Chamada de vídeo"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onStartCall}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
                aria-label="Chamada"
              >
                <Phone className="h-5 w-5" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 md:flex"
            aria-label="Pesquisar"
          >
            <Search className="h-5 w-5" />
          </button>
          {onHide ? (
            <button
              type="button"
              onClick={onHide}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
              aria-label="Remover da lista"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-4",
          // Fundo estilo WhatsApp (bege) com a marca da casa
          "bg-[#ece5dd]",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22><g fill=%22%230a2f6e%22 fill-opacity=%220.04%22><circle cx=%2220%22 cy=%2220%22 r=%222%22/><circle cx=%2280%22 cy=%2250%22 r=%221.5%22/><circle cx=%2240%22 cy=%2290%22 r=%221.5%22/><path d=%22M90 15h8v2h-8zM15 70h6v2h-6z%22/></g></svg>')]",
        )}
      >
        {grouped.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xs rounded-lg bg-[#fff9c4]/90 px-4 py-3 text-center text-[13px] text-navy/70 shadow-sm">
            Envie a primeira mensagem. Suas conversas ficam guardadas aqui.
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-3xl space-y-1">
          {grouped.map((item) => {
            if (item.type === "day") {
              return (
                <div key={item.key} className="flex justify-center py-2">
                  <span className="rounded-lg bg-[#e1f0fa] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-navy/60 shadow-sm">
                    {item.label}
                  </span>
                </div>
              );
            }
            const mine = isMine(item.message);
            return (
              <MessageBubble
                key={item.message.id}
                message={item.message}
                mine={mine}
                showSender={false}
              />
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        body={body}
        onBodyChange={setBody}
        onSubmit={onSubmit}
        onSendAudio={onSendAudio}
        onSendVideo={onSendVideo}
        disabled={composerDisabled}
        placeholder={placeholder}
        topSlot={composerTopSlot}
      />
    </div>
  );
}

export function chatListTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (dayKey(iso) === dayKey(today.toISOString())) return formatTime(iso);
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Ontem";
  return formatDate(iso);
}
