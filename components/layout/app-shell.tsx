"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { ChatAlertWatcher } from "@/components/chat/chat-alert-watcher";
import { useAppStore } from "@/hooks/use-app-store";
import {
  appLabelForRole,
  canAccess,
  type AppModule,
} from "@/lib/permissions";
import { PageLoader } from "@/components/brand/page-loader";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { homePathForUser, isFilhoDeSanto, isFilhoPortalPath } from "@/lib/filho";
import { isClientPortalPath, isMemberPortalPath } from "@/lib/navigation";

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

/** Areas da casa / modulos internos ? cliente nao entra */
const staffOnlyPrefixes = [
  "/inicio",
  "/dashboard",
  "/menu",
  "/perfil",
  "/cadastros",
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

/** Prefixo reservado ? sem bloqueio ativo no portal do cliente */
const clientBlockedPrefixes: string[] = [];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, state } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const sessionId = state.currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    // Tem sid/id mas o perfil ainda nao entrou no store ? nao chutar para /
    if (!currentUser) {
      if (sessionId) return;
      router.replace("/");
      return;
    }

    const home = homePathForUser(currentUser);
    const filho = isFilhoDeSanto(currentUser);

    if (currentUser.role === "cliente") {
      if (filho && isClientPortalPath(pathname)) {
        const rest = pathname === "/cliente" ? "" : pathname.slice("/cliente".length);
        router.replace(`/filho${rest}`);
        return;
      }
      if (!filho && isFilhoPortalPath(pathname)) {
        router.replace("/cliente");
        return;
      }
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

    if (isMemberPortalPath(pathname)) {
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

  if (!ready || !currentUser) {
    // Aguarda sessao/perfil ? sem brasao (splash so no cold start).
    return (
      <PageLoader label="Preparando o app?" delayMs={150} className="min-h-dvh" />
    );
  }

  // Chat estilo WhatsApp: conversa em tela cheia no mobile; area /conversas tambem no desktop
  const isChatThread =
    pathname.startsWith("/conversas/") ||
    pathname === "/cliente/mensagens" ||
    pathname === "/filho/mensagens" ||
    pathname === "/cliente/financeiro-chat" ||
    pathname === "/filho/financeiro-chat";
  const isChatSection =
    pathname === "/conversas" ||
    pathname.startsWith("/conversas/") ||
    pathname === "/cliente/mensagens" ||
    pathname === "/filho/mensagens" ||
    pathname === "/cliente/financeiro-chat" ||
    pathname === "/filho/financeiro-chat";

  return (
    <div
      className={
        isChatSection
          ? "relative flex h-dvh max-h-dvh bg-[#d1d7db]"
          : "relative flex min-h-screen overflow-x-hidden bg-mist"
      }
    >
      {!isChatSection ? <BrandWatermarks /> : null}
      <ChatAlertWatcher />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {!isChatSection ? (
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy/10 bg-card/95 px-4 py-3 backdrop-blur md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl p-2 text-navy transition hover:bg-navy/5"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">
                {appLabelForRole(currentUser.role)}
              </p>
            </div>
          </header>
        ) : null}
        <main
          className={
            isChatSection
              ? `flex min-h-0 w-full flex-1 flex-col overflow-hidden p-0 ${
                  isChatThread ? "" : "pb-[4.5rem] md:pb-0"
                }`
              : "mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 md:px-8 md:pb-8"
          }
        >
          {children}
        </main>
        {!isChatThread ? <BottomNav /> : null}
      </div>
    </div>
  );
}
