"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { blobToDataUrl, formatAudioDuration, pickAudioMimeType } from "@/lib/chat";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 60;
const MIN_MS = 350;

type Props = {
  onSend: (payload: { dataUrl: string; durationSec: number }) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Estilo WhatsApp: segura o microfone → grava; solta → envia sozinho.
 * Usa touch + pointer para funcionar no iPhone/Android.
 */
export function AudioRecorder({ onSend, disabled, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const holdingRef = useRef(false);
  const cancelRef = useRef(false);
  const startingRef = useRef(false);
  const sendRef = useRef(onSend);
  const activePointerRef = useRef<number | null>(null);
  sendRef.current = onSend;

  useEffect(() => {
    return () => {
      cleanupStream();
      clearTimer();
    };
  }, []);

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function ensureMicPermission() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Mantém o stream para a gravação seguinte (evita diálogo no meio do “segurar”)
    streamRef.current = stream;
    setArmed(true);
    return stream;
  }

  async function beginRecord() {
    if (startingRef.current || (mediaRef.current && mediaRef.current.state !== "inactive")) {
      return;
    }
    startingRef.current = true;
    setError("");
    try {
      let stream = streamRef.current;
      if (!stream || stream.getTracks().some((t) => t.readyState !== "live")) {
        stream = await ensureMicPermission();
      }
      if (!holdingRef.current || cancelRef.current) {
        startingRef.current = false;
        return;
      }

      const mime = pickAudioMimeType();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 24000 })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        clearTimer();
        const durationMs = Date.now() - startedAtRef.current;
        const durationSec = Math.max(1, Math.round(durationMs / 1000));
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        // Para o recorder, mas mantém tracks vivas para a próxima gravação
        mediaRef.current = null;
        setRecording(false);
        setElapsed(0);
        startingRef.current = false;
        activePointerRef.current = null;

        if (cancelRef.current) return;
        if (durationMs < MIN_MS || blob.size < 200) {
          setError("Segure o botão para gravar.");
          return;
        }
        try {
          const dataUrl = await blobToDataUrl(blob);
          sendRef.current({ dataUrl, durationSec });
          setError("");
        } catch {
          setError("Não foi possível enviar o áudio.");
        }
      };

      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      recorder.start(100);
      timerRef.current = setInterval(() => {
        const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
        setElapsed(sec);
        if (sec >= MAX_SECONDS) stopAndSend();
      }, 200);
    } catch {
      setError("Permita o microfone e segure de novo.");
      setRecording(false);
      setArmed(false);
      cleanupStream();
    } finally {
      startingRef.current = false;
    }
  }

  function stopAndSend() {
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.requestData?.();
      } catch {
        // ignore
      }
      recorder.stop();
    } else {
      clearTimer();
      setRecording(false);
      setElapsed(0);
      startingRef.current = false;
    }
  }

  function pressStart(pointerId: number, target: HTMLElement) {
    if (disabled) return;
    if (activePointerRef.current !== null && activePointerRef.current !== pointerId) return;
    activePointerRef.current = pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // ignore
    }
    holdingRef.current = true;
    cancelRef.current = false;
    setError("");
    void beginRecord();
  }

  function pressEnd(pointerId: number) {
    if (activePointerRef.current !== null && activePointerRef.current !== pointerId) return;
    holdingRef.current = false;
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      stopAndSend();
    } else if (startingRef.current) {
      // Soltou durante getUserMedia / start — cancela se ainda não gravou
      // (se gravar começar depois e holding já for false, beginRecord sai cedo)
    }
  }

  function pressCancel(pointerId: number) {
    if (activePointerRef.current !== null && activePointerRef.current !== pointerId) return;
    holdingRef.current = false;
    cancelRef.current = true;
    stopAndSend();
    activePointerRef.current = null;
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {recording ? (
        <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white shadow-soft">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          {formatAudioDuration(elapsed)} · solte p/ enviar
        </div>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        aria-label="Segure para gravar áudio; solte para enviar"
        // Pointer cobre mouse + touch moderno
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pressStart(e.pointerId, e.currentTarget);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pressEnd(e.pointerId);
        }}
        onPointerCancel={(e) => {
          e.preventDefault();
          pressCancel(e.pointerId);
        }}
        onLostPointerCapture={(e) => {
          pressEnd(e.pointerId);
        }}
        // Fallback só se não houver Pointer Events (evita double-fire no iOS)
        onTouchStart={(e) => {
          if (typeof window !== "undefined" && "PointerEvent" in window) return;
          e.preventDefault();
          e.stopPropagation();
          const t = e.changedTouches[0];
          if (!t) return;
          pressStart(t.identifier, e.currentTarget);
        }}
        onTouchEnd={(e) => {
          if (typeof window !== "undefined" && "PointerEvent" in window) return;
          e.preventDefault();
          e.stopPropagation();
          const t = e.changedTouches[0];
          if (!t) return;
          pressEnd(t.identifier);
        }}
        onTouchCancel={(e) => {
          if (typeof window !== "undefined" && "PointerEvent" in window) return;
          const t = e.changedTouches[0];
          if (!t) return;
          pressCancel(t.identifier);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "flex h-14 w-14 shrink-0 touch-none select-none items-center justify-center rounded-full transition [-webkit-touch-callout:none] [-webkit-user-select:none]",
          recording
            ? "scale-110 bg-danger text-white shadow-soft"
            : "bg-navy text-white hover:bg-navy/90 disabled:opacity-40",
        )}
      >
        <Mic className="h-6 w-6" />
      </button>
      {!recording ? (
        <p className="mt-1 max-w-[7.5rem] text-center text-[10px] leading-tight text-navy/50">
          {armed ? "Segure p/ gravar" : "Segure o microfone"}
        </p>
      ) : null}
      {error && !recording ? (
        <p className="mt-1 max-w-[9rem] text-center text-[10px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
