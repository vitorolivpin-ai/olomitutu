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
  if (msg.kind === "video") return "Vídeo";
  if (msg.kind === "call") return "Chamada de vídeo";
  return msg.body;
}

/** Sala Jitsi estável por cliente (chamada de vídeo no chat). */
export function videoCallRoomUrl(clientId: string) {
  const safe = clientId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "casa";
  return `https://meet.jit.si/olomitutu-${safe}`;
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
  // iPhone/Safari costuma só aceitar mp4; Chrome prefere webm
  const candidates = [
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}
