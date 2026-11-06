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
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { UserAvatar } from "@/components/profile/user-avatar";
import { useAppStore } from "@/hooks/use-app-store";
import { CLIENT_WHATSAPP, openWhatsApp } from "@/lib/client-whatsapp";
import { isFilhoDeSanto, portalLabelForUser } from "@/lib/filho";
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
  { href: "/ajodun/liberacoes", label: "Ajodun liberações", icon: CalendarDays, module: "house_content" as const },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, module: "agenda" as const },
  { href: "/disponibilidade", label: "Horários", icon: CalendarClock, module: "agenda" as const },
  { href: "/conversas", label: "Conversas", icon: MessageCircle, module: "chat" as const },
  { href: "/relatorios", label: "Relatórios", icon: ChartColumn, module: "reports" as const },
  { href: "/notificacoes", label: "Notificações", icon: Bell, module: "notifications" as const },
  { href: "/menu", label: "Conta", icon: Settings2, module: "dashboard" as const },
];

/** Pai: Clientes e chat no topo — é o que se olha primeiro. */
const paiLinks = [
  { href: "/inicio", label: "Início", icon: LayoutDashboard },
  { href: "/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/clientes", label: "Clientes de jogo", icon: UserRound },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/disponibilidade", label: "Horários", icon: CalendarClock },
  { href: "/cadastros", label: "Cadastros pendentes", icon: UserRound },
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
  { href: "/dashboard", label: "Resumo", icon: ChartColumn },
  { href: "/membros", label: "Membros", icon: Users },
  { href: "/mensalidades", label: "Mensalidades", icon: Receipt },
  { href: "/cobrancas", label: "Cobranças", icon: CreditCard },
  { href: "/despesas", label: "Despesas", icon: Wallet },
  { href: "/financeiro", label: "Análise financeira", icon: ChartColumn },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/loja", label: "Loja", icon: Package },
  { href: "/loja/liberacoes", label: "Liberações da loja", icon: Package },
  { href: "/conteudo", label: "Conteúdo da casa", icon: BookOpen },
  { href: "/educacao", label: "Educação", icon: BookOpen },
  { href: "/hierarquia", label: "Hierarquia", icon: Users },
  { href: "/checklist", label: "Checklist", icon: Receipt },
  { href: "/ajodun", label: "Ajodun", icon: CalendarDays },
  { href: "/ajodun/liberacoes", label: "Ajodun liberações", icon: CalendarDays },
  { href: "/fotos", label: "Fotos", icon: BookOpen },
  { href: "/relatorios", label: "Relatórios", icon: ChartColumn },
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
  { href: "/cliente", label: "Início", icon: LayoutDashboard, external: false },
  { href: "/cliente/horarios", label: "Marcar horário (Pix)", icon: CalendarDays, external: false },
  {
    href: "/cliente/mensagens",
    label: "Chat com Vitor Cardozo - Ògún Yande",
    icon: MessageCircle,
    external: false,
  },
  { href: "/cliente/notificacoes", label: "Notificações", icon: Bell, external: false },
  { href: "/cliente/cadastro", label: "Meu cadastro", icon: UserRound, external: false },
];

const filhoLinks = [
  { href: "/filho", label: "Início", icon: LayoutDashboard, external: false },
  { href: "/filho/mensalidade", label: "Mensalidade", icon: Wallet, external: false },
  { href: "/filho/educacao", label: "Educação", icon: BookOpen, external: false },
  { href: "/filho/biblioteca", label: "Biblioteca", icon: BookOpen, external: false },
  { href: "/filho/ajodun", label: "Ajodun", icon: CalendarDays, external: false },
  { href: "/filho/hierarquia", label: "Hierarquia", icon: Users, external: false },
  { href: "/filho/checklist", label: "O que fazer", icon: Receipt, external: false },
  { href: "/filho/loja", label: "Loja", icon: Package, external: false },
  {
    href: "/filho/mensagens",
    label: "Chat com Vitor Cardozo - Ògún Yande",
    icon: MessageCircle,
    external: false,
  },
  {
    href: "/filho/financeiro-chat",
    label: "Chat com o Financeiro",
    icon: Wallet,
    external: false,
  },
  { href: "/filho/notificacoes", label: "Notificações", icon: Bell, external: false },
  { href: "/filho/conta", label: "Menu / conta", icon: Settings2, external: false },
  {
    href: CLIENT_WHATSAPP.duvidas.href,
    label: CLIENT_WHATSAPP.duvidas.label,
    icon: WhatsAppIcon,
    external: true,
  },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, state } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const isClient = currentUser?.role === "cliente";
  const isFilho = isFilhoDeSanto(currentUser);
  const isStockApp = currentUser?.role === "estoque";
  const isLibraryApp = currentUser?.role === "biblioteca";
  const isPai = currentUser?.role === "pai_de_santo";
  const unread = mounted
    ? unreadCountForRole(state.notifications, currentUser?.role, {
        clientId: currentUser?.client_id,
      })
    : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fecha o drawer ao trocar de página no celular
  useEffect(() => {
    onClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const links = isClient
    ? isFilho
      ? filhoLinks
      : clientLinks
    : isStockApp
      ? stockLinks
      : isLibraryApp
        ? libraryAppLinks
        : isPai
          ? paiLinks
          : staffLinks.filter((l) => canAccess(currentUser?.role, l.module) || l.href === "/menu");

  const panel = (
    <>
      <div className="flex items-center gap-3 border-b border-navy/10 px-5 py-5">
        <BrandMark className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gold-deep">
            {portalLabelForUser(currentUser) ?? appLabelForRole(currentUser?.role)}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-navy/55 transition hover:bg-navy/5 hover:text-navy md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const external = "external" in link && link.external;
          const active = external
            ? false
            : link.href === "/"
              ? pathname === "/"
              : link.href === "/cliente" || link.href === "/filho"
                ? pathname === link.href
                : link.href === "/estoque"
                  ? pathname === "/estoque"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const className = cn(
            "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
            active ? "bg-navy text-white shadow-soft" : "text-navy/70 hover:bg-navy/5",
          );
          const content = (
            <>
              <Icon className={cn("h-5 w-5 shrink-0", active ? "text-gold" : "text-gold-deep")} />
              <span className="flex-1 leading-snug">{link.label}</span>
              {(link.href === "/notificacoes" ||
                link.href === "/cliente/notificacoes" ||
                link.href === "/filho/notificacoes") &&
              unread > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    active ? "bg-gold text-navy" : "bg-danger text-white",
                  )}
                >
                  {unread}
                </span>
              ) : null}
            </>
          );
          if (external) {
            return (
              <button
                key={`${link.href}-${link.label}`}
                type="button"
                className={cn(className, "w-full text-left")}
                onClick={() => {
                  // Fecha depois — se fechar antes, o iOS cancela o WhatsApp
                  openWhatsApp(link.href);
                  window.setTimeout(() => onClose?.(), 300);
                }}
              >
                {content}
              </button>
            );
          }
          return (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className={className}
              onClick={() => onClose?.()}
            >
              {content}
            </Link>
          );
        })}
      </nav>
      {currentUser ? (
        <Link
          href={isClient ? "/cliente/cadastro" : "/perfil"}
          className="flex items-center gap-3 border-t border-navy/10 p-4 text-sm transition hover:bg-navy/5"
          onClick={() => onClose?.()}
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
    </>
  );

  return (
    <>
      {/* Desktop: coluna fixa */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-navy/10 md:bg-white/80 md:backdrop-blur">
        {panel}
      </aside>

      {/* Mobile: drawer lateral */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-navy/40 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Fechar menu"
          onClick={onClose}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-navy/10 bg-white shadow-soft transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {panel}
        </aside>
      </div>
    </>
  );
}
