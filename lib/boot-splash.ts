/** Marca splash de boot já exibida nesta sessão de aba (não em troca de rota). */
export const BOOT_SPLASH_SESSION_KEY = "ile-oloroke-boot-splash-done";

export function wasBootSplashCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(BOOT_SPLASH_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBootSplashCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BOOT_SPLASH_SESSION_KEY, "1");
  } catch {
    // ignore
  }
  document.documentElement.dataset.bootDone = "1";
}
