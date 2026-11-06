"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Package,
  PackageMinus,
  PackagePlus,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/hooks/use-app-store";
import { unreadChatCountForRole } from "@/lib/notifications";
import { canAccess } from "@/lib/permissions";

const staffItems = [
  { href: "/inicio", label: "Início", icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/menu", label: "Menu", icon: Menu },
];

const paiItems = [
  { href: "/inicio", label: "Quem somos", icon: LayoutDashboard },
  { href: "/conteudo", label: "Conteúdo", icon: BookOpen },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/menu", label: "Menu", icon: Menu },
];

const stockItems = [
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/estoque/entrada", label: "Entrada", icon: PackagePlus },
  { href: "/estoque/saida", label: "Saída", icon: PackageMinus },
  { href: "/menu", label: "Menu", icon: Menu },
];

const libraryAppItems = [
  { href: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/biblioteca/novo", label: "Publicar", icon: BookOpen },
  { href: "/menu", label: "Menu", icon: Menu },
  { href: "/", label: "Início", icon: LayoutDashboard },
];

const clientItems = [
  { href: "/cliente", label: "Quem somos", icon: LayoutDashboard },
  { href: "/cliente/loja", label: "Loja", icon: Package },
  { href: "/cliente/horarios", label: "Horários", icon: CalendarDays },
  { href: "/cliente/mensagens", label: "Pai", icon: MessageCircle },
  { href: "/cliente/conta", label: "Menu", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const { currentUser, state } = useAppStore();
  const isClient = currentUser?.role === "cliente";
  const isStockApp = currentUser?.role === "estoque";
  const isLibraryApp = currentUser?.role === "biblioteca";
  const isPai = currentUser?.role === "pai_de_santo";

  const chatUnread = unreadChatCountForRole(
    state.notifications ?? [],
    currentUser?.role,
    { clientId: currentUser?.client_id },
  );

  const clientNotifUnread =
    currentUser?.role === "cliente"
      ? (state.notifications ?? []).filter(
          (n) =>
            !n.read &&
            n.audience?.includes("cliente") &&
            (n.type !== "chat" ||
              !n.related_id ||
              n.related_id === currentUser.client_id),
        ).length
      : 0;

  const visible = isClient
    ? clientItems
    : isStockApp
      ? stockItems
      : isLibraryApp
        ? libraryAppItems
        : isPai
          ? paiItems
          : staffItems.filter((item) => {
              if (item.href === "/menu") return true;
              if (item.href === "/financeiro") {
                return (
                  canAccess(currentUser?.role, "finance") ||
                  canAccess(currentUser?.role, "members") ||
                  canAccess(currentUser?.role, "fees")
                );
              }
              if (item.href === "/conversas") return canAccess(currentUser?.role, "chat");
              if (item.href === "/agenda") return canAccess(currentUser?.role, "agenda");
          if (item.href === "/dashboard" || item.href === "/inicio") {
            return canAccess(currentUser?.role, "dashboard");
          }
          return true;
            });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-white/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/cliente"
                ? pathname === "/cliente"
                : item.href === "/estoque"
                  ? pathname === "/estoque"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showChatBadge =
            (item.href === "/conversas" || item.href === "/cliente/mensagens") &&
            chatUnread > 0 &&
            !active;
          const showMenuBadge =
            item.href === "/cliente/conta" && clientNotifUnread > 0 && !active;
          const badgeCount = showChatBadge
            ? chatUnread
            : showMenuBadge
              ? clientNotifUnread
              : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                  active ? "text-navy" : "text-navy/45",
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "text-gold-deep")} />
                  {badgeCount > 0 ? (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
