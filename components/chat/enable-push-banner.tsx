"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ensureNotificationPermission,
  isPushSupported,
  registerChatServiceWorker,
  subscribeWebPush,
} from "@/lib/push-client";

const STORAGE_KEY = "ile-push-chat-enabled";
const DECLINE_KEY = "ile-push-chat-declined";

export function EnablePushBanner() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSupported(isPushSupported());
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    setDeclined(localStorage.getItem(DECLINE_KEY) === "1");
    void registerChatServiceWorker();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    }
  }, []);

  if (!supported || enabled || declined) return null;

  async function onAllow() {
    setBusy(true);
    setMessage("");
    const permission = await ensureNotificationPermission();
    if (permission !== "granted") {
      setMessage(
        permission === "denied"
          ? "O celular bloqueou. Em Ajustes do site/navegador, permita notificações e tente de novo."
          : "Não foi possível ativar. Tente novamente.",
      );
      setBusy(false);
      setAsking(false);
      return;
    }

    const push = await subscribeWebPush();
    localStorage.setItem(STORAGE_KEY, "1");
    localStorage.removeItem(DECLINE_KEY);
    setEnabled(true);
    if (!push.ok) {
      setMessage(
        push.error.includes("VAPID")
          ? "Permissão concedida. Alertas locais ok — para push com o app fechado, configure VAPID no Vercel."
          : `Permissão concedida. ${push.error}`,
      );
    } else {
      setMessage("Permissão concedida — você receberá alertas de novas mensagens.");
    }
    setBusy(false);
    setAsking(false);
  }

  function onDecline() {
    localStorage.setItem(DECLINE_KEY, "1");
    setDeclined(true);
    setAsking(false);
  }

  return (
    <Card className="border-l-4 border-l-gold">
      <div className="flex flex-wrap items-start gap-3">
        <BellRing className="mt-0.5 h-6 w-6 shrink-0 text-gold-deep" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-navy">Permitir notificações?</p>
          <p className="mt-1 text-sm text-navy/65">
            O app pode avisar no celular quando um cliente mandar mensagem em Conversas.
            Você pode mudar isso depois nas configurações do navegador.
          </p>
          {message ? <p className="mt-2 text-xs text-navy/55">{message}</p> : null}

          {!asking ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="gold"
                disabled={busy}
                onClick={() => setAsking(true)}
              >
                <Bell className="mr-2 h-4 w-4" />
                Quero receber
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={onDecline}>
                <BellOff className="mr-2 h-4 w-4" />
                Agora não
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2 rounded-2xl bg-mist/70 p-3">
              <p className="text-sm font-medium text-navy">
                O navegador vai perguntar se este site pode enviar notificações. Pode
                permitir?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="gold" disabled={busy} onClick={() => void onAllow()}>
                  {busy ? "Solicitando…" : "Sim, permitir"}
                </Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={onDecline}>
                  Não permitir
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
