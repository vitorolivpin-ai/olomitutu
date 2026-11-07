"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <p className="font-display text-2xl text-navy">Não foi possível carregar</p>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Tente novamente. Se o problema continuar, volte ao início.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="gold" onClick={() => reset()}>
          Recarregar
        </Button>
        <a
          href="/"
          className="rounded-2xl bg-card px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-navy/10"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}
