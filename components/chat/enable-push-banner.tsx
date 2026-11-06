"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ensureNotificationPermission,
  isIosDevice,
  isPushSupported,
  isStandaloneDisplay,
  registerChatServiceWorker,
  subscribeWebPush,
} from "@/lib/push-client";

const STORAGE_KEY = "ile-push-chat-enabled";

type Props = {
  /** Texto para o App do Cliente */
  forClient?: boolean;
};

export function EnablePushBanner({ forClient = false }: Props) {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem("ile-push-chat-declined");
    } catch {
      /* ignore */
    }

    const ok = isPushSupported();
    const iosInstall = isIosDevice() && !isStandaloneDisplay();
    setSupported(ok);
    setIosNeedsInstall(iosInstall);

    if (ok && typeof Notification !== "undefined") {
      setPermission(Notification.permission);
      if (Notification.permission === "granted" && localStorage.getItem(STORAGE_KEY) === "1") {
        setHidden(true);
      }
    }

    if (ok) {
      void registerChatServiceWorker().catch(() => null);
    }
    setReady(true);
  }, []);

  if (!ready || hidden) return null;
  if (!supported && !iosNeedsInstall) return null;

  async function onAllowClick() {
    setBusy(true);
    setMessage("");

    if (isIosDevice() && !isStandaloneDisplay()) {
      setMessage(
        "No iPhone: abra no Safari → Compartilhar → Adicionar à Tela de Início. Depois abra pelo ícone e toque em Permitir de novo.",
      );
      setBusy(false);
      return;
    }

    if (!isPushSupported()) {
      setMessage("Este navegador não permite notificações. Use Chrome/Safari atualizado.");
      setBusy(false);
      return;
    }

    try {
      await registerChatServiceWorker();
      const result = await ensureNotificationPermission();
      setPermission(result);

      if (result !== "granted") {
        setMessage(
          result === "denied"
            ? "O celular bloqueou. Em Ajustes do site/navegador, permita notificações e tente de novo."
            : "Toque em Permitir quando o sistema perguntar.",
        );
        setBusy(false);
        return;
      }

      const push = await subscribeWebPush();
      localStorage.setItem(STORAGE_KEY, "1");
      setMessage(
        push.ok
          ? "Pronto — notificações ativadas."
          : push.error.includes("VAPID")
            ? "Permissão liberada. Para alertas com o app fechado, configure VAPID no Vercel."
            : `Permissão liberada. ${push.error}`,
      );
      window.setTimeout(() => setHidden(true), 2800);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao pedir permissão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-l-4 border-l-gold">
      <div className="flex flex-wrap items-start gap-3">
        <BellRing className="mt-0.5 h-6 w-6 shrink-0 text-gold-deep" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-navy">Permitir notificações?</p>
          <p className="mt-1 text-sm text-navy/65">
            {forClient
              ? "Receba alerta no celular quando o Pai de Santo responder no chat."
              : "Receba alerta no celular quando um cliente mandar mensagem em Conversas."}{" "}
            Toque em <strong>Permitir notificações</strong>.
          </p>
          {iosNeedsInstall ? (
            <p className="mt-2 rounded-xl bg-mist/80 px-3 py-2 text-xs text-navy/70">
              No iPhone a pergunta só aparece depois de instalar: Safari → Compartilhar →{" "}
              <strong>Adicionar à Tela de Início</strong>, abrir pelo ícone, e então tocar em
              Permitir.
            </p>
          ) : null}
          {permission === "denied" ? (
            <p className="mt-2 text-xs text-danger">
              Notificações bloqueadas para este site. Libere nos ajustes do navegador.
            </p>
          ) : null}
          {message ? <p className="mt-2 text-xs text-navy/60">{message}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="gold"
              disabled={busy || permission === "denied"}
              onClick={() => void onAllowClick()}
            >
              <Bell className="mr-2 h-4 w-4" />
              {busy ? "Pedindo permissão…" : "Permitir notificações"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setHidden(true)}>
              <BellOff className="mr-2 h-4 w-4" />
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
