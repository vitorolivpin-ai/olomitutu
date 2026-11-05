"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Camera, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/empty-state";

type Props = {
  onScan: (code: string) => void;
  label?: string;
  autoFocusManual?: boolean;
};

/**
 * Leitura por câmera (html5-qrcode) + digitação / leitor USB (teclado).
 */
export function BarcodeScanner({
  onScan,
  label = "Código de barras",
  autoFocusManual = true,
}: Props) {
  const regionId = useId().replace(/:/g, "");
  const [manual, setManual] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [cameraSupported, setCameraSupported] = useState(true);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef({ code: "", at: 0 });

  useEffect(() => {
    if (autoFocusManual && !cameraOn) {
      inputRef.current?.focus();
    }
  }, [autoFocusManual, cameraOn]);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  function emit(code: string) {
    const clean = code.trim();
    if (!clean) return;
    const now = Date.now();
    if (clean === lastScanRef.current.code && now - lastScanRef.current.at < 1500) {
      return;
    }
    lastScanRef.current = { code: clean, at: now };
    onScan(clean);
    setManual("");
  }

  function onManualSubmit(e: FormEvent) {
    e.preventDefault();
    emit(manual);
  }

  async function startCamera() {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(`qr-${regionId}`);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 260, height: 140 } },
        (decoded) => emit(decoded),
        () => undefined,
      );
      scannerRef.current = scanner;
      setCameraOn(true);
    } catch (err) {
      setCameraSupported(false);
      setCameraOn(false);
      setError(
        err instanceof Error
          ? `Câmera indisponível: ${err.message}. Use a digitação ou um leitor USB.`
          : "Câmera indisponível. Use a digitação ou um leitor USB.",
      );
    }
  }

  async function stopCamera() {
    try {
      await scannerRef.current?.stop();
    } catch {
      // ignore
    }
    scannerRef.current = null;
    setCameraOn(false);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onManualSubmit} className="space-y-2">
        <Label htmlFor={`barcode-${regionId}`}>{label}</Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id={`barcode-${regionId}`}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Escaneie ou digite o código"
            inputMode="numeric"
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" aria-label="Confirmar código">
            <Keyboard className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-navy/50">
          Funciona com câmera do celular ou leitor de código de barras USB.
        </p>
      </form>

      <div className="flex flex-wrap gap-2">
        {!cameraOn ? (
          <Button type="button" variant="gold" onClick={startCamera} disabled={!cameraSupported}>
            <Camera className="h-4 w-4" /> Abrir câmera
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={stopCamera}>
            Fechar câmera
          </Button>
        )}
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      <div
        id={`qr-${regionId}`}
        className={cameraOn ? "overflow-hidden rounded-2xl border border-navy/10" : "hidden"}
      />
    </div>
  );
}
