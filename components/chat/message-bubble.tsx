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
        ) : (
          <p>{message.body}</p>
        )}
        <p className="mt-1 text-right text-[10px] opacity-60">{formatTime(message.created_at)}</p>
      </div>
    </div>
  );
}
