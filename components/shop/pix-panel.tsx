"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPixCopyPaste, pixQrDataUrl } from "@/lib/pix";

type Props = {
  pixKey?: string | null;
  holderName?: string | null;
  amount?: number;
  description?: string;
  className?: string;
};

export function PixPanel({
  pixKey,
  holderName,
  amount,
  description,
  className,
}: Props) {
  const [copied, setCopied] = useState(false);
  const key = pixKey?.trim() ?? "";

  const copyPaste = useMemo(() => {
    if (!key) return "";
    return buildPixCopyPaste({
      key,
      holderName: holderName ?? undefined,
      amount,
      description,
    });
  }, [key, holderName, amount, description]);

  const qr = useMemo(
    () => (copyPaste ? pixQrDataUrl(copyPaste, amount ? `R$ ${amount.toFixed(2)}` : "PIX") : ""),
    [copyPaste, amount],
  );

  if (!key) {
    return (
      <p className={`rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy/65 ${className ?? ""}`}>
        Configure a chave Pix da casa em <strong>Perfil</strong> para exibir o QR aqui.
      </p>
    );
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className={`space-y-3 rounded-xl border border-navy/10 bg-white p-4 ${className ?? ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/45">Pix da casa</p>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR Code Pix" className="mx-auto h-44 w-44" />
      ) : null}
      <p className="break-all text-center text-sm text-navy/80">{key}</p>
      {holderName ? (
        <p className="text-center text-xs text-navy/50">{holderName}</p>
      ) : null}
      <Button type="button" variant="secondary" className="w-full" onClick={() => void onCopy()}>
        {copied ? (
          <>
            <Check className="h-4 w-4" /> Chave copiada
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> Copiar chave Pix
          </>
        )}
      </Button>
    </div>
  );
}
