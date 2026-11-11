"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { isDemoOverrideActive } from "@/lib/demo-accounts";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAppStore } from "@/hooks/use-app-store";

type Status = {
  configured: boolean;
  connected: boolean;
  signed_in?: boolean;
  house?: boolean;
  google_email?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth_incompleto: "Retorno do Google incompleto. Tente conectar de novo.",
  sessao_oauth_expirada:
    "Sessão do Google expirou no celular. Entre de novo como Pai e tente outra vez.",
  precisa_login_real:
    "Google Calendar não funciona com a conta demo. Entre com o e-mail real do Pai (Supabase) e conecte de novo.",
  sessao_perdida_mobile:
    "No celular a sessão caiu ao voltar do Google. Entre de novo como Pai (conta real) e toque em Conectar outra vez.",
};

export function GoogleCalendarCard() {
  const { currentUser } = useAppStore();
  const search = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canConnect = currentUser?.role === "pai_de_santo";
  const configured = status?.configured === true;
  const needsRealLogin = status?.signed_in === false;

  useEffect(() => {
    const gcal = search.get("gcal");
    if (gcal === "ok") setMessage("Google Calendar conectado.");
    if (gcal === "disconnected") setMessage("Google Calendar desconectado.");
    if (gcal === "config") {
      setMessage("Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Vercel.");
    }
    if (gcal === "forbidden") setMessage("Só o Pai de Santo pode conectar.");
    if (gcal === "norefresh") {
      setMessage("Google não enviou refresh token. Desconecte o app no Google e tente de novo.");
    }
    if (gcal === "error") {
      const raw = search.get("msg") || "";
      setMessage(ERROR_MESSAGES[raw] || raw || "Falha ao conectar Google Calendar.");
    }
  }, [search]);

  useEffect(() => {
    void fetch("/api/google/status")
      .then((r) => r.json())
      .then((j: Status) => setStatus(j))
      .catch(() => setStatus({ configured: false, connected: false, signed_in: false }));
  }, []);

  async function connect() {
    if (!configured || busy) return;
    setBusy(true);
    setMessage(null);

    if (isDemoOverrideActive() || needsRealLogin) {
      const supabase = createBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (!data.session) {
        setBusy(false);
        setMessage(ERROR_MESSAGES.precisa_login_real);
        return;
      }
    }

    // Navegação top-level (evita <a><button>, que falha no celular)
    window.location.assign("/api/google/connect");
  }

  async function disconnect() {
    setBusy(true);
    const res = await fetch("/api/google/disconnect", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setStatus((s) => (s ? { ...s, connected: false, google_email: null } : s));
      setMessage("Google Calendar desconectado.");
    }
  }

  if (!canConnect) return null;

  return (
    <Card>
      <CardTitle>Google Calendar</CardTitle>
      <p className="mt-1 text-sm text-navy/60">
        Só o Pai conecta a agenda dele. Depois, todos os jogos confirmados (de qualquer visitante)
        e os cancelamentos sincronizam com o Google.
      </p>
      {message ? <p className="mt-2 text-sm text-navy/80">{message}</p> : null}
      {!message && configured && needsRealLogin ? (
        <p className="mt-2 text-sm text-navy/80">
          {ERROR_MESSAGES.precisa_login_real}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status?.connected ? (
          <>
            <p className="text-sm text-success">
              Conectado{status.google_email ? `: ${status.google_email}` : ""}.
            </p>
            <Button variant="secondary" disabled={busy} onClick={() => void disconnect()}>
              Desconectar
            </Button>
          </>
        ) : (
          <Button
            variant="gold"
            disabled={!configured || busy || status === null}
            onClick={() => void connect()}
          >
            Conectar Google Calendar
          </Button>
        )}
      </div>
      {status && !status.configured ? (
        <p className="mt-2 text-xs text-navy/45">
          Falta configurar as chaves Google no Vercel (veja o README).
        </p>
      ) : null}
    </Card>
  );
}
