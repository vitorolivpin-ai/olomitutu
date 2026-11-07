"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import {
  markBootSplashCompleted,
  wasBootSplashCompleted,
} from "@/lib/boot-splash";

const PAINT_ID = "boot-splash";

function hidePaintNode(el: HTMLElement, immediate: boolean) {
  el.style.transition = immediate ? "none" : "opacity 220ms ease-out";
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
  el.setAttribute("aria-hidden", "true");
  el.dataset.dismissed = "1";
  if (immediate) {
    el.style.visibility = "hidden";
    el.style.display = "none";
  }
}

/**
 * Descarta a splash HTML de 1º paint UMA vez, após o store ficar pronto.
 *
 * Nunca reexibe o brasão quando `ready` oscila ou o layout RSC re-renderiza —
 * a sessão + `data-boot-done` no <html> impedem novo mount visual.
 */
export function BootSplashClear() {
  const { ready } = useAppStore();
  const dismissedRef = useRef(wasBootSplashCompleted());

  // Sessão já passou pela splash (hard nav / remount): esconder na hora, sem reaparecer.
  useEffect(() => {
    if (!dismissedRef.current) return;
    markBootSplashCompleted();
    const el = document.getElementById(PAINT_ID);
    if (el) hidePaintNode(el, true);
  }, []);

  useEffect(() => {
    if (dismissedRef.current) return;

    const el = document.getElementById(PAINT_ID);
    if (!el) {
      if (ready) {
        dismissedRef.current = true;
        markBootSplashCompleted();
      }
      return;
    }

    // Já descartada nesta página — não voltar a mostrar (mesmo se ready=false).
    if (el.dataset.dismissed === "1") {
      dismissedRef.current = true;
      markBootSplashCompleted();
      return;
    }

    if (!ready) return;

    dismissedRef.current = true;
    markBootSplashCompleted();
    hidePaintNode(el, false);
    const t = window.setTimeout(() => {
      el.style.visibility = "hidden";
      el.style.display = "none";
    }, 240);
    return () => window.clearTimeout(t);
  }, [ready]);

  return null;
}
