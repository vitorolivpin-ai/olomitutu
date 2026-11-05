"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blobToDataUrl, formatAudioDuration, pickAudioMimeType } from "@/lib/chat";
import { AudioPlayer } from "@/components/chat/audio-player";

const MAX_SECONDS = 60;

type Props = {
  onSend: (payload: { dataUrl: string; durationSec: number }) => void;
  disabled?: boolean;
};

export function AudioRecorder({ onSend, disabled }: Props) {
  const [phase, setPhase] = useState<"idle" | "recording" | "preview">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [error, setError] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (timerRef.current) clearInterval(timerRef.current);
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

  async function startRecording() {
    setError("");
    setPreviewUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        cleanupStream();
        if (blob.size < 200) {
          setError("Áudio muito curto. Tente de novo.");
          setPhase("idle");
          return;
        }
        try {
          const dataUrl = await blobToDataUrl(blob);
          setPreviewUrl(dataUrl);
          setPreviewDuration(durationSec);
          setPhase("preview");
        } catch {
          setError("Não foi possível preparar o áudio.");
          setPhase("idle");
        }
      };
      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase("recording");
      recorder.start(250);
      timerRef.current = setInterval(() => {
        const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
        setElapsed(sec);
        if (sec >= MAX_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch {
      setError("Permita o microfone no navegador para gravar áudio.");
      setPhase("idle");
      cleanupStream();
    }
  }

  function stopRecording() {
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupStream();
      clearTimer();
      setPhase("idle");
    }
  }

  function cancelPreview() {
    setPreviewUrl(null);
    setPreviewDuration(0);
    setPhase("idle");
    setElapsed(0);
  }

  function sendPreview() {
    if (!previewUrl) return;
    onSend({ dataUrl: previewUrl, durationSec: previewDuration });
    cancelPreview();
  }

  if (phase === "recording") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 px-3 py-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
        <p className="flex-1 text-sm font-medium text-navy">
          Gravando {formatAudioDuration(elapsed)}
          <span className="ml-1 text-navy/45">/ {formatAudioDuration(MAX_SECONDS)}</span>
        </p>
        <Button type="button" variant="danger" onClick={stopRecording} aria-label="Parar gravação">
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (phase === "preview" && previewUrl) {
    return (
      <div className="space-y-2 rounded-2xl border border-navy/10 bg-mist/60 p-3">
        <AudioPlayer src={previewUrl} durationSec={previewDuration} />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={cancelPreview} className="flex-1">
            <Trash2 className="h-4 w-4" /> Descartar
          </Button>
          <Button type="button" onClick={sendPreview} className="flex-1">
            <Send className="h-4 w-4" /> Enviar áudio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="secondary"
        onClick={startRecording}
        disabled={disabled}
        aria-label="Gravar áudio"
        className="w-full sm:w-auto"
      >
        <Mic className="h-4 w-4" /> Áudio
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
