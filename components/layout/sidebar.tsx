"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Package,
  PackageMinus,
  PackagePlus,
  Receipt,
  Settings2,
  Users,
  UserRound,
  Wallet,
  Bell,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { UserAvatar } from "@/components/profile/user-avatar";
import { useAppStore } from "@/hooks/use-app-store";
import { unreadCountForRole } from "@/lib/notifications";
import { appLabelForRole, canAccess, roleLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const staffLinks = [
  { href: "/inicio", label: "Overview", icon: LayoutDashboard, module: "dashboard" as const },
  { href: "/dashboard", label: "Resumo", icon: LayoutDashboard, module: "dashboard" as const },
  { href: "/membros", label: "Membros", icon: Users, module: "members" as const },
  { href: "/mensalidades", label: "Mensalidades", icon: Receipt, module: "fees" as const },
  { href: "/cobrancas", label: "Cobranças", icon: CreditCard, module: "charges" as const },
  { href: "/despesas", label: "Despesas", icon: Wallet, module: "expenses" as const },
  { href: "/financeiro", label: "Análise", icon: ChartColumn, module: "finance" as const },
  { href: "/clientes", label: "Clientes", icon: UserRound, module: "clients" as const },
  { href: "/estoque", label: "Estoque", icon: Package, module: "stock" as const },
  { href: "/biblioteca", label: "Biblioteca", icon: BookOpen, module: "library" as const },
  { href: "/loja", label: "Loja", icon: Package, module: "shop" as const },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, module: "agenda" as const },
  { href: "/disponibilidade", label: "Horários", icon: CalendarClock, module: "agenda" as const },
  { href: "/conversas", label: "Conversas", icon: MessageCircle, module: "chat" as const },
  { href: "/relatorios", label: "Relatórios", icon: ChartColumn, module: "reports" as const },
  { href: "/notificacoes", label: "Notificações", icon: Bell, module: "notifications" as const },
  { href: "/menu", label: "Conta", icon: Settings2, module: "dashboard" as const },
];

const paiLinks = [
  { href: "/inicio", label: "Quem somos", icon: LayoutDashboard },
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
  { href: "/conteudo", label: "Conteúdo da casa", icon: BookOpen },
  { href: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/loja", label: "Loja", icon: Package },
  { href: "/clientes", label: "Clientes", icon: UserRound },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/disponibilidade", label: "Horários", icon: CalendarClock },
  { href: "/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/menu", label: "Conta", icon: Settings2 },
];

const stockLinks = [
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/estoque/entrada", label: "Entrada", icon: PackagePlus },
  { href: "/estoque/saida", label: "Saída", icon: PackageMinus },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/menu", label: "Conta", icon: Settings2 },
  { href: "/", label: "Menu principal", icon: LayoutDashboard },
];

const libraryAppLinks = [
  { href: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/biblioteca/novo", label: "Novo material", icon: BookOpen },
  { href: "/conteudo", label: "Conteúdo da casa", icon: BookOpen },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/menu", label: "Conta", icon: Settings2 },
  { href: "/", label: "Menu principal", icon: LayoutDashboard },
];

const clientLinks = [
  { href: "/cliente", label: "Quem somos", icon: LayoutDashboard },
  { href: "/cliente/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/cliente/loja", label: "Loja", icon: Package },
  { href: "/cliente/horarios", label: "Horários", icon: CalendarDays },
  { href: "/cliente/mensagens", label: "Falar com o Pai", icon: MessageCircle },
  { href: "/cliente/cadastro", label: "Meu cadastro", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, state } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const isClient = currentUser?.role === "cliente";
  const isStockApp = currentUser?.role === "estoque";
  const isLibraryApp = currentUser?.role === "biblioteca";
  const isPai = currentUser?.role === "pai_de_santo";
  // Badge só depois do mount — localStorage ≠ seed do SSR (evita hydration mismatch)
  const unread = mounted
    ? unreadCountForRole(state.notifications, currentUser?.role)
    : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const links = isClient
    ? clientLinks
    : isStockApp
      ? stockLinks
      : isLibraryApp
        ? libraryAppLinks
        : isPai
          ? paiLinks
          : staffLinks.filter((l) => canAccess(currentUser?.role, l.module) || l.href === "/menu");

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-navy/10 md:bg-white/80 md:backdrop-blur">
      <div className="flex items-center gap-3 border-b border-navy/10 px-5 py-5">
        <BrandMark className="h-16 w-16 shrink-0" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gold-deep">
            {appLabelForRole(currentUser?.role)}
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/"
              ? pathname === "/"
              : link.href === "/cliente"
                ? pathname === "/cliente"
                : link.href === "/estoque"
                  ? pathname === "/estoque"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                active ? "bg-navy text-white shadow-soft" : "text-navy/70 hover:bg-navy/5",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-gold" : "text-gold-deep")} />
              <span className="flex-1">{link.label}</span>
              {link.href === "/notificacoes" && unread > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    active ? "bg-gold text-navy" : "bg-danger text-white",
                  )}
                >
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      {currentUser ? (
        <Link
          href={isClient ? "/cliente/conta" : "/perfil"}
          className="flex items-center gap-3 border-t border-navy/10 p-4 text-sm transition hover:bg-navy/5"
        >
          <UserAvatar
            name={currentUser.full_name}
            src={currentUser.avatar_url}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-navy">{currentUser.full_name}</p>
            <p className="text-navy/55">{roleLabel(currentUser.role)}</p>
          </div>
        </Link>
      ) : null}
    </aside>
  );
}
