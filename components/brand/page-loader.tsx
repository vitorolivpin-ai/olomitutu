"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
  /** Atraso antes de mostrar o spinner — evita flicker em rotas rápidas. */
  delayMs?: number;
};

/**
 * Loading leve de rota/dados — sem brasão, logo ou nome da casa.
 * A Splash com brasão existe só no boot inicial (#boot-splash).
 */
export function PageLoader({
  className,
  label = "Carregando…",
  delayMs = 200,
}: Props) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  return (
    <div
      className={cn(
        "flex min-h-[40dvh] items-center justify-center bg-transparent px-6",
        className,
      )}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {visible ? (
        <span
          className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-navy/20 border-t-navy"
          aria-hidden
        />
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

/** @deprecated use PageLoader */
export function RouteLoading(props: Props) {
  return <PageLoader {...props} />;
}
