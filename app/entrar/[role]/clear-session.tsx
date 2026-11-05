"use client";

import { useEffect } from "react";
import { SESSION_KEY } from "@/lib/storage";

/**
 * Ao abrir o login de uma área, limpa a sessão anterior
 * para não cair na aba errada (ex.: Biblioteca).
 */
export function ClearPreviousSession() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      document.cookie = "ile-oloroke-sid=; path=/; max-age=0; samesite=lax";
    } catch {
      // ignore
    }
  }, []);
  return null;
}
