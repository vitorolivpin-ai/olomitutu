"use client";

import type { Message } from "@/types";
import { AudioPlayer } from "@/components/chat/audio-player";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  message: Message;
  mine: boolean;
};

export function MessageBubble({ message, mine }: Props) {
  const isAudio = message.kind === "audio" && Boolean(message.audio_data_url);
  const isVideo = message.kind === "video" && Boolean(message.video_data_url);
  const isCall = message.kind === "call";

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-soft",
          mine ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-white text-navy",
        )}
      >
        <p className="mb-1 text-[11px] opacity-70">{message.sender_name}</p>
        {isAudio && message.audio_data_url ? (
          <AudioPlayer
            src={message.audio_data_url}
            durationSec={message.audio_duration_sec}
            inverted={mine}
          />
        ) : isVideo && message.video_data_url ? (
          <video
            src={message.video_data_url}
            controls
            playsInline
            className="mt-1 max-h-56 w-full rounded-xl bg-black/80"
          />
        ) : isCall && message.call_url ? (
          <div className="space-y-2">
            <p>{message.body || "Chamada de vídeo"}</p>
            <a
              href={message.call_url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-block rounded-xl px-3 py-2 text-xs font-semibold underline",
                mine ? "bg-white/15 text-white" : "bg-navy/5 text-navy",
              )}
            >
              Entrar na chamada
            </a>
          </div>
        ) : (
          <p>{message.body}</p>
        )}
        <p className="mt-1 text-right text-[10px] opacity-60">{formatTime(message.created_at)}</p>
      </div>
    </div>
  );
}
