"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAVY = { r: 11, g: 50, b: 107 };

/** Recorta as bordas vazias e devolve um PNG transparente. */
function trimCanvas(src: HTMLCanvasElement) {
  const ctx = src.getContext("2d");
  if (!ctx) return null;
  const { width, height } = src;
  const img = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (img[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")?.drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

/** Foto da assinatura em papel → fundo removido, traço em azul-marinho. */
async function cleanUploadedSignature(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const maxW = 1200;
    const scale = Math.min(1, maxW / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const d = data.data;
    // limiar a partir do brilho médio (papel claro)
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    const avg = sum / (d.length / 4);
    const cut = Math.min(200, avg - 40);
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const alphaIn = d[i + 3];
      let a = 0;
      if (lum < cut) a = Math.min(255, ((cut - lum) / Math.max(1, cut - 30)) * 255 + 60);
      d[i] = NAVY.r;
      d[i + 1] = NAVY.g;
      d[i + 2] = NAVY.b;
      d[i + 3] = Math.round((a * alphaIn) / 255);
    }
    ctx.putImageData(data, 0, 0);
    return trimCanvas(c);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SignaturePad({
  value,
  onChange,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<"ver" | "desenhar">(value ? "ver" : "desenhar");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "desenhar") return;
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * ratio);
    c.height = Math.round(rect.height * ratio);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b326b";
    ctx.lineWidth = 2.6;
  }, [mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const p = pos(e);
    if (!ctx || !last.current) return;
    const pressure = e.pressure && e.pressure !== 0.5 ? e.pressure : 0.6;
    ctx.lineWidth = 1.6 + pressure * 2.4;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setDirty(true);
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setDirty(false);
  };

  const useDrawing = () => {
    const c = canvasRef.current;
    if (!c) return;
    const png = trimCanvas(c);
    if (png) {
      onChange(png);
      setMode("ver");
      setDirty(false);
    }
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    const png = await cleanUploadedSignature(file).catch(() => null);
    setBusy(false);
    if (png) {
      onChange(png);
      setMode("ver");
    }
  };

  return (
    <div className="space-y-3">
      {mode === "ver" && value ? (
        <div className="rounded-2xl border border-navy/15 bg-white p-4">
          <div className="flex h-28 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Assinatura salva" className="max-h-24 max-w-full object-contain" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setMode("desenhar")}>
              Desenhar de novo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(undefined)}>
              Remover assinatura
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="relative rounded-2xl border-2 border-dashed border-navy/20 bg-white">
            <canvas
              ref={canvasRef}
              className="block h-44 w-full touch-none rounded-2xl"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              aria-label="Área para desenhar a assinatura"
            />
            {!dirty ? (
              <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-navy/40">
                Assine aqui com o dedo, caneta ou mouse
              </p>
            ) : null}
            <div className="pointer-events-none absolute inset-x-6 bottom-8 h-px bg-navy/20" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="gold" disabled={!dirty} onClick={useDrawing}>
              Usar esta assinatura
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={clear}>
              <Eraser className="mr-1 h-4 w-4" /> Limpar
            </Button>
            {value ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setMode("ver")}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy/75 hover:text-navy">
        <Upload className="h-4 w-4" />
        {busy ? "Tratando a imagem…" : "Ou envie uma foto da assinatura no papel (o fundo é removido)"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
