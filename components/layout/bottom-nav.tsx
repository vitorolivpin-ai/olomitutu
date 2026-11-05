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
  { href: "/cliente/mensagens", label: "Chat", icon: MessageCircle },
  { href: "/cliente/cadastro", label: "Cadastro", icon: UserRound },
  { href: "/", label: "Menu", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const { currentUser } = useAppStore();
  const isClient = currentUser?.role === "cliente";
  const isStockApp = currentUser?.role === "estoque";
  const isLibraryApp = currentUser?.role === "biblioteca";
  const isPai = currentUser?.role === "pai_de_santo";

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
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                  active ? "text-navy" : "text-navy/45",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-gold-deep")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
