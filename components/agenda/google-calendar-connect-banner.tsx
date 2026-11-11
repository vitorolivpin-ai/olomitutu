"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/use-app-store";

type Status = {
  configured: boolean;
  connected: boolean;
  google_email?: string | null;
};

/**
 * CTA na home do Pai: ele conecta a agenda uma vez;
 * depois todos os jogos confirmados sincronizam.
 */
export function GoogleCalendarConnectBanner() {
  const { currentUser } = useAppStore();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== "pai_de_santo") return;
    void fetch("/api/google/status")
      .then((r) => r.json())
      .then((j: Status) => setStatus(j))
      .catch(() => setStatus({ configured: false, connected: false }));
  }, [currentUser?.role]);

  if (currentUser?.role !== "pai_de_santo") return null;
  if (!status || status.connected) return null;

  const canConnect = status.configured;

  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-card p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-navy">
          <CalendarDays className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight text-navy">Google Calendar</p>
          <p className="mt-0.5 text-sm text-navy/55">
            Conecte a sua agenda. Depois, todo Jogo que você aprovar entra automaticamente no
            Google — de qualquer visitante.
          </p>
          {!canConnect ? (
            <p className="mt-1 text-xs text-navy/45">
              Falta configurar as chaves Google no Vercel.
            </p>
          ) : null}
        </div>
      </div>
      <Button
        variant="gold"
        size="md"
        className="w-full shrink-0 sm:w-auto"
        disabled={!canConnect || busy}
        onClick={() => {
          if (!canConnect || busy) return;
          setBusy(true);
          window.location.assign("/api/google/connect");
        }}
      >
        Conectar minha agenda
      </Button>
    </div>
  );
}
