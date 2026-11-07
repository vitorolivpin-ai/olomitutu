"use client";

import { useEffect } from "react";
import { useAppStore } from "@/hooks/use-app-store";

/** Mantém a splash HTML até o store ficar pronto; depois remove com fade curto. */
export function BootSplashClear() {
  const { ready } = useAppStore();

  useEffect(() => {
    if (!ready) return;
    const el = document.getElementById("boot-splash");
    if (!el) return;
    el.style.opacity = "0";
    el.style.transition = "opacity 220ms ease-out";
    const t = window.setTimeout(() => el.remove(), 240);
    return () => window.clearTimeout(t);
  }, [ready]);

  return null;
}
