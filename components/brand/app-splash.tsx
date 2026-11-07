/**
 * Splash com brasão — exclusivo do boot inicial.
 *
 * O paint real vive em `app/layout.tsx` (#boot-splash) + `BootSplashClear`.
 * Não importe este componente como fallback de rota; use `PageLoader`.
 */
export function AppSplash() {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[AppSplash] Não use em rotas. A splash de boot é só #boot-splash no layout raiz.",
    );
  }
  return null;
}
