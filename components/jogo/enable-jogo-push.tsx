"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ensureNotificationPermission,
  isIosDevice,
  isPushSupported,
  isStandaloneDisplay,
  registerChatServiceWorker,
  subscribeWebPush,
} from "@/lib/push-client";

type Props = {
  appointmentId: string;
  /** Após confirmação — URL /marcar/acesso/[token] */
  accessToken?: string;
  /** Durante hold / aguardando aprovação */
  guestSecret?: string;
  className?: string;
};

function storageKey(appointmentId: string) {
  return `ile-jogo-push-${appointmentId}`;
}

/**
 * Opt-in explícito do visitante — nunca pede permissão no load.
 */
export function EnableJogoPush({
  appointmentId,
  accessToken,
  guestSecret,
  className,
}: Props) {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const ok = isPushSupported();
    setSupported(ok);
    setIosNeedsInstall(isIosDevice() && !isStandaloneDisplay());
    try {
      if (localStorage.getItem(storageKey(appointmentId)) === "1") {
        setEnabled(true);
        setHidden(true);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [appointmentId]);

  if (!ready || hidden) return null;
  if (!supported && !iosNeedsInstall) return null;
  if (!accessToken && !guestSecret) return null;

  async function onEnable() {
    setBusy(true);
    setMessage("");

    if (isIosDevice() && !isStandaloneDisplay()) {
      setMessage(
        "No iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Depois abra pelo ícone e ative de novo.",
      );
      setBusy(false);
      return;
    }

    if (!isPushSupported()) {
      setMessage("Este navegador não permite notificações.");
      setBusy(false);
      return;
    }

    try {
      await registerChatServiceWorker();
      const permission = await ensureNotificationPermission();
      if (permission !== "granted") {
        setMessage(
          permission === "denied"
            ? "Notificações bloqueadas. Libere nos ajustes do navegador."
            : "Toque em Permitir quando o sistema perguntar.",
        );
        setBusy(false);
        return;
      }

      const push = await subscribeWebPush({
        jogoId: appointmentId,
        accessToken,
        guestSecret,
      });

      if (push.ok) {
        try {
          localStorage.setItem(storageKey(appointmentId), "1");
        } catch {
          /* ignore */
        }
        setEnabled(true);
        setMessage("Notificações deste Jogo ativadas.");
        window.setTimeout(() => setHidden(true), 2400);
      } else {
        setMessage(
          push.error.includes("VAPID")
            ? "Permissão liberada. Configure VAPID no servidor para alertas com o app fechado."
            : push.error,
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao ativar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        className ??
        "mt-4 rounded-2xl bg-mist/70 px-3 py-3 text-left text-sm text-navy/70"
      }
    >
      <p className="font-medium text-navy">
        {enabled ? "Notificações deste Jogo ativas" : "Ativar notificações deste Jogo"}
      </p>
      <p className="mt-1 text-xs text-navy/55">
        Opcional. O e-mail continua obrigatório. Sem dados sensíveis na tela de bloqueio.
      </p>
      {iosNeedsInstall ? (
        <p className="mt-2 text-xs text-navy/60">
          No iPhone, instale na Tela de Início antes de permitir notificações.
        </p>
      ) : null}
      {message ? <p className="mt-2 text-xs text-navy/60">{message}</p> : null}
      {!enabled ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="gold"
            disabled={busy}
            onClick={() => void onEnable()}
          >
            <Bell className="mr-2 h-4 w-4" />
            {busy ? "Ativando…" : "Ativar notificações deste Jogo"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setHidden(true)}
          >
            <BellOff className="mr-2 h-4 w-4" />
            Agora não
          </Button>
        </div>
      ) : null}
    </div>
  );
}
