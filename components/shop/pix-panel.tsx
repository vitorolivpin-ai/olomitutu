"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { buildPixCopyPaste, pixQrDataUrl } from "@/lib/pix";
import { cn } from "@/lib/utils";

type Props = {
  pixKey?: string | null;
  holderName?: string | null;
  amount?: number;
  description?: string;
  className?: string;
  /** Layout compacto da Loja (mockup). */
  variant?: "default" | "loja";
};

export function PixPanel({
  pixKey,
  holderName,
  amount,
  description,
  className,
  variant = "default",
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
    () =>
      copyPaste
        ? pixQrDataUrl(copyPaste, amount ? `R$ ${amount.toFixed(2)}` : "PIX")
        : "",
    [copyPaste, amount],
  );

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (!key) {
    return (
      <p
        className={cn(
          "rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy/65",
          className,
        )}
      >
        Configure a chave Pix da casa em <strong>Perfil</strong> para exibir o QR
        aqui.
      </p>
    );
  }

  if (variant === "loja") {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-xs leading-relaxed text-navy/55">
          Escaneie o QR Code ou copie a chave PIX para realizar o pagamento.
        </p>
        <div className="flex flex-wrap items-start gap-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="QR Code Pix"
              className="h-32 w-32 shrink-0 rounded-xl bg-white p-1 ring-1 ring-navy/10"
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            {amount != null ? (
              <p className="text-sm text-navy">
                Valor:{" "}
                <span className="font-display text-lg font-semibold text-gold-deep">
                  R$ {amount.toFixed(2).replace(".", ",")}
                </span>
              </p>
            ) : null}
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 break-all text-xs text-navy/70">{key}</p>
              <button
                type="button"
                onClick={() => void onCopy()}
                className="shrink-0 rounded-lg bg-navy/5 p-2 text-navy transition hover:bg-navy/10"
                aria-label="Copiar chave PIX"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            {holderName ? (
              <p className="text-xs text-navy/45">{holderName}</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-navy/25 bg-white px-4 py-3 text-sm font-semibold text-navy transition hover:bg-mist"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Chave copiada
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copiar chave PIX
            </>
          )}
        </button>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-navy/45">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Pedidos com a casa podem levar até 3 dias úteis para confirmação.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-navy/10 bg-white p-4",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/45">
        Pix da casa
      </p>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR Code Pix" className="mx-auto h-44 w-44" />
      ) : null}
      <p className="break-all text-center text-sm text-navy/80">{key}</p>
      {holderName ? (
        <p className="text-center text-xs text-navy/50">{holderName}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void onCopy()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" /> Chave copiada
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> Copiar chave Pix
          </>
        )}
      </button>
    </div>
  );
}
