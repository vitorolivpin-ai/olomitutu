import type { Message } from "@/types";

export function formatAudioDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function messagePreview(msg: Message | undefined | null) {
  if (!msg) return "Sem mensagens ainda";
  if (msg.kind === "audio") {
    const dur =
      typeof msg.audio_duration_sec === "number"
        ? formatAudioDuration(msg.audio_duration_sec)
        : null;
    return dur ? `Áudio · ${dur}` : "Áudio";
  }
  return msg.body;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler áudio"));
    reader.readAsDataURL(blob);
  });
}

export function pickAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}
