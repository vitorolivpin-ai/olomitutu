"use client";

import type { Message } from "@/types";
import { AudioPlayer } from "@/components/chat/audio-player";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";

type Props = {
  message: Message;
  mine: boolean;
  showSender?: boolean;
};

export function MessageBubble({ message, mine, showSender = false }: Props) {
  const audioSrc = message.audio_data_url || message.audio_url;
  const videoSrc = message.video_data_url || message.video_url;
  const isAudio = message.kind === "audio" && Boolean(audioSrc);
  const isVideo = message.kind === "video" && Boolean(videoSrc);
  const isCall = message.kind === "call";

  return (
    <div className={cn("flex px-1", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[85%] px-2 pb-1 pt-1.5 text-[14.5px] leading-[1.35] shadow-sm sm:max-w-[65%]",
          mine
            ? "rounded-lg rounded-tr-none bg-[#d4eaf7] text-navy"
            : "rounded-lg rounded-tl-none bg-white text-navy",
        )}
      >
        {showSender && !mine ? (
          <p className="mb-0.5 text-[12px] font-semibold text-gold-deep">{message.sender_name}</p>
        ) : null}

        {isAudio && audioSrc ? (
          <div className="min-w-[220px] py-1">
            <AudioPlayer
              src={audioSrc}
              durationSec={message.audio_duration_sec}
              inverted={false}
            />
          </div>
        ) : isVideo && videoSrc ? (
          <video
            src={videoSrc}
            controls
            playsInline
            className="mt-0.5 max-h-56 w-full min-w-[12rem] rounded-md bg-black/80"
          />
        ) : isCall && message.call_url ? (
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10">
                <Phone className="h-4 w-4 text-navy" />
              </span>
              <span>{message.body || "Chamada de vídeo"}</span>
            </div>
            <a
              href={message.call_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white"
            >
              Entrar na chamada
            </a>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words pr-12">{message.body}</p>
        )}

        <p className="mt-0.5 text-right text-[10px] leading-none text-navy/45">
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
