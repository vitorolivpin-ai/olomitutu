"use client";

import { useEffect } from "react";
import { SESSION_KEY } from "@/lib/storage";
import { writeViewAsArea } from "@/lib/view-as";

/**
 * Ao abrir o login de uma área, limpa a sessão local anterior
 * para não cair na aba errada (ex.: Biblioteca).
 * A sessão Supabase é substituída no POST /api/entrar.
 */
export function ClearPreviousSession() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      document.cookie = "ile-oloroke-sid=; path=/; max-age=0; samesite=lax";
      writeViewAsArea(null);
    } catch {
      // ignore
    }
  }, []);
  return null;
}
