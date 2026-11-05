"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatAudioDuration } from "@/lib/chat";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  durationSec?: number;
  inverted?: boolean;
};

export function AudioPlayer({ src, durationSec, inverted }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTime() {
      if (!audio) return;
      setProgress(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    }
    function onEnded() {
      setPlaying(false);
      setProgress(0);
    }
    function onMeta() {
      if (!audio) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    }

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onMeta);
    };
  }, [src]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  const total = duration || durationSec || 0;
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;

  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
          inverted ? "bg-white/15 text-white hover:bg-white/25" : "bg-navy/10 text-navy hover:bg-navy/15",
        )}
        aria-label={playing ? "Pausar áudio" : "Ouvir áudio"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "h-1.5 overflow-hidden rounded-full",
            inverted ? "bg-white/25" : "bg-navy/15",
          )}
        >
          <div
            className={cn("h-full rounded-full", inverted ? "bg-gold" : "bg-navy")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={cn("mt-1 text-[11px]", inverted ? "text-white/70" : "text-navy/55")}>
          {formatAudioDuration(playing || progress > 0 ? progress : total)}
          {total > 0 && !playing && progress === 0 ? "" : total > 0 ? ` / ${formatAudioDuration(total)}` : ""}
        </p>
      </div>
    </div>
  );
}
