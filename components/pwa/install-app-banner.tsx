"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { registerChatServiceWorker } from "@/lib/push-client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ile-pwa-install-dismissed";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIosChromeOrOther() {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  // Chrome/Firefox/Edge no iOS usam WebKit, mas não têm “Adicionar à Tela de Início”
  return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    Boolean(window.navigator.standalone)
  );
}

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [iosNonSafari, setIosNonSafari] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void registerChatServiceWorker();
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    setIos(isIos());
    setIosNonSafari(isIosChromeOrOther());

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos()) setVisible(true);

    const t = window.setTimeout(() => {
      if (!isStandalone()) setVisible(true);
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(t);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  async function onInstall() {
    if (!deferred) return;
    setBusy(true);
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setBusy(false);
    setDeferred(null);
    if (choice.outcome === "accepted") setVisible(false);
  }

  function onDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <Card className="border-l-4 border-l-navy">
      <div className="flex flex-wrap items-start gap-3">
        <Download className="mt-0.5 h-6 w-6 shrink-0 text-gold-deep" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-navy">Instalar no iPhone / celular</p>
          {ios ? (
            <div className="mt-1 space-y-2 text-sm text-navy/65">
              {iosNonSafari ? (
                <p className="rounded-xl bg-warning/20 px-3 py-2 text-navy">
                  Abra este site no <strong>Safari</strong> (não no Chrome). No iPhone só o
                  Safari instala na tela de início.
                </p>
              ) : null}
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Toque em <Share className="mx-0.5 inline h-3.5 w-3.5 text-gold-deep" />{" "}
                  <strong>Compartilhar</strong> (barra de baixo do Safari)
                </li>
                <li>
                  Role e toque em <strong>Adicionar à Tela de Início</strong>
                </li>
                <li>
                  Confirme em <strong>Adicionar</strong>
                </li>
              </ol>
              <p className="text-xs text-navy/50">
                O ícone “OLÓMÌ TÚTÙ” aparece na tela inicial como um app.
              </p>
            </div>
          ) : deferred ? (
            <p className="mt-1 text-sm text-navy/65">
              Instale na tela inicial para abrir como aplicativo e receber alertas.
            </p>
          ) : (
            <p className="mt-1 text-sm text-navy/65">
              No Chrome: menu ⋮ → <strong>Instalar aplicativo</strong> (ou “Adicionar à
              tela inicial”).
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {deferred ? (
              <Button size="sm" variant="gold" disabled={busy} onClick={() => void onInstall()}>
                {busy ? "Abrindo…" : "Instalar agora"}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
