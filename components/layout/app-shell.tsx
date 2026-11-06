"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { ChatAlertWatcher } from "@/components/chat/chat-alert-watcher";
import { useAppStore } from "@/hooks/use-app-store";
import { LoadingBlock } from "@/components/ui/empty-state";
import { appLabelForRole, canAccess, type AppModule } from "@/lib/permissions";
import { BrandMark } from "@/components/brand/logo";
import { homePathForRole, isClientPortalPath } from "@/lib/navigation";

const routeModules: Array<{ prefix: string; module: AppModule }> = [
  { prefix: "/membros", module: "members" },
  { prefix: "/mensalidades", module: "fees" },
  { prefix: "/cobrancas", module: "charges" },
  { prefix: "/despesas", module: "expenses" },
  { prefix: "/financeiro", module: "finance" },
  { prefix: "/clientes", module: "clients" },
  { prefix: "/estoque", module: "stock" },
  { prefix: "/biblioteca", module: "library" },
  { prefix: "/loja", module: "shop" },
  { prefix: "/conteudo", module: "house_content" },
  { prefix: "/quem-somos", module: "house_content" },
  { prefix: "/educacao", module: "house_content" },
  { prefix: "/hierarquia", module: "house_content" },
  { prefix: "/checklist", module: "house_content" },
  { prefix: "/ajodun", module: "house_content" },
  { prefix: "/fotos", module: "house_content" },
  { prefix: "/agenda", module: "agenda" },
  { prefix: "/disponibilidade", module: "agenda" },
  { prefix: "/atendimentos", module: "agenda" },
  { prefix: "/conversas", module: "chat" },
  { prefix: "/relatorios", module: "reports" },
  { prefix: "/notificacoes", module: "notifications" },
];

/** Áreas da casa / módulos internos — cliente não entra */
const staffOnlyPrefixes = [
  "/inicio",
  "/dashboard",
  "/menu",
  "/perfil",
  "/membros",
  "/mensalidades",
  "/cobrancas",
  "/despesas",
  "/financeiro",
  "/clientes",
  "/estoque",
  "/biblioteca",
  "/loja",
  "/relatorios",
  "/notificacoes",
  "/agenda",
  "/disponibilidade",
  "/conversas",
  "/conteudo",
  "/quem-somos",
  "/educacao",
  "/hierarquia",
  "/checklist",
  "/ajodun",
  "/fotos",
  "/atendimentos",
];

/** Prefixo reservado — sem bloqueio ativo no portal do cliente */
const clientBlockedPrefixes: string[] = [];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, state } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const sessionId = state.currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    // Tem sid/id mas o perfil ainda não entrou no store → não chutar para /
    if (!currentUser) {
      if (sessionId) return;
      router.replace("/");
      return;
    }

    const home = homePathForRole(currentUser.role);

    if (currentUser.role === "cliente") {
      const onStaffArea = staffOnlyPrefixes.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );
      const onBlockedClient = clientBlockedPrefixes.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );
      if (onStaffArea || onBlockedClient) {
        router.replace(home);
        return;
      }
      return;
    }

    if (isClientPortalPath(pathname)) {
      router.replace(home);
      return;
    }

    if (pathname === "/dashboard" && !canAccess(currentUser.role, "dashboard")) {
      router.replace(home);
      return;
    }

    const match = routeModules.find((r) => pathname.startsWith(r.prefix));
    if (match && !canAccess(currentUser.role, match.module)) {
      router.replace(home);
    }
  }, [ready, currentUser, sessionId, pathname, router]);

  if (!ready) return <LoadingBlock />;
  if (!currentUser) {
    return (
      <LoadingBlock
        label={sessionId ? "Carregando sua conta..." : "Redirecionando..."}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-app">
      <ChatAlertWatcher />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy/10 bg-white/85 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-xl p-2 text-navy transition hover:bg-navy/5"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <BrandMark className="h-12 w-12 shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-xs text-gold-deep">
              {appLabelForRole(currentUser.role)}
            </p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 md:px-8 md:pb-8">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
