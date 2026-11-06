"use client";

import { useRef, useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blobToDataUrl } from "@/lib/chat";

const MAX_BYTES = 12 * 1024 * 1024; // ~12MB no demo (localStorage)

type Props = {
  onSend: (payload: { dataUrl: string }) => void;
  disabled?: boolean;
};

export function VideoAttach({ onSend, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onPick(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Escolha um arquivo de vídeo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Vídeo grande demais (máx. ~12 MB neste MVP).");
      return;
    }
    setPending(true);
    try {
      const dataUrl = await blobToDataUrl(file);
      onSend({ dataUrl });
    } catch {
      setError("Não foi possível ler o vídeo.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
      >
        <Video className="mr-1.5 h-4 w-4" />
        {pending ? "Enviando…" : "Vídeo"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
