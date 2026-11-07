import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout autenticado — sem Suspense em volta do AppShell.
 * (Suspense no shell inteiro desmontava nav/chrome a cada rota e podia
 *  reexpor estados de boot.) Loading de página: `loading.tsx` + PageLoader.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
