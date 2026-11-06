"use client";

import { FormEvent, useRef } from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import { AudioRecorder } from "@/components/chat/audio-recorder";
import { cn } from "@/lib/utils";

type Props = {
  body: string;
  onBodyChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSendAudio: (payload: { dataUrl: string; durationSec: number }) => void;
  onSendVideo: (payload: { dataUrl: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  topSlot?: React.ReactNode;
};

export function ChatComposer({
  body,
  onBodyChange,
  onSubmit,
  onSendAudio,
  onSendVideo,
  placeholder = "Digite uma mensagem",
  disabled,
  topSlot,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasText = Boolean(body.trim());

  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 bg-[#f0f2f5] px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5"
    >
      {topSlot}
      <div className="flex items-end gap-1.5">
        <div className="flex min-h-[44px] flex-1 items-end gap-0.5 rounded-[24px] bg-white px-1.5 py-1 shadow-sm">
          <button
            type="button"
            disabled={disabled}
            aria-label="Emoji"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-navy/40"
          >
            <Smile className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void (async () => {
                const { blobToDataUrl } = await import("@/lib/chat");
                if (!file.type.startsWith("video/")) return;
                if (file.size > 12 * 1024 * 1024) return;
                const dataUrl = await blobToDataUrl(file);
                onSendVideo({ dataUrl });
              })();
            }}
          />
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            rows={1}
            placeholder={placeholder}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (body.trim()) onSubmit(e as unknown as FormEvent);
              }
            }}
            className={cn(
              "max-h-32 min-h-[2rem] flex-1 resize-none bg-transparent py-2 text-[15px] text-navy outline-none placeholder:text-navy/40",
            )}
          />
          <button
            type="button"
            disabled={disabled}
            aria-label="Anexar"
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-navy/40 transition hover:text-navy"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </div>

        {hasText ? (
          <button
            type="submit"
            disabled={disabled}
            aria-label="Enviar"
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-white shadow-sm transition hover:bg-navy-mid disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        ) : (
          <AudioRecorder
            disabled={disabled}
            onSend={onSendAudio}
            className="mb-0.5 [&_button]:h-11 [&_button]:w-11 [&_p]:hidden"
          />
        )}
      </div>
    </form>
  );
}
