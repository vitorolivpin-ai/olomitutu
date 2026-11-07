"use client";

import { useEffect } from "react";
import { useAppStore } from "@/hooks/use-app-store";

/**
 * Esconde a splash HTML após o store ficar pronto.
 * Não remove o nó do DOM (evita insertBefore/removeChild com o React).
 */
export function BootSplashClear() {
  const { ready } = useAppStore();

  useEffect(() => {
    const el = document.getElementById("boot-splash");
    if (!el) return;

    if (!ready) {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      el.style.visibility = "visible";
      return;
    }

    el.style.transition = "opacity 220ms ease-out";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    const t = window.setTimeout(() => {
      el.style.visibility = "hidden";
    }, 240);
    return () => window.clearTimeout(t);
  }, [ready]);

  return null;
}
