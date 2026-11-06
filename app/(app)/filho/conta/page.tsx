"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isFilhoDeSanto } from "@/lib/filho";
import { unreadCountForRole } from "@/lib/notifications";

const appLinks = [
  { href: "/filho", label: "Início", icon: LayoutDashboard },
  { href: "/filho/mensalidade", label: "Mensalidade", icon: Wallet },
  { href: "/filho/educacao", label: "Educação", icon: BookOpen },
  { href: "/filho/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/filho/ajodun", label: "Ajodun", icon: CalendarDays },
  { href: "/filho/hierarquia", label: "Hierarquia", icon: Users },
  { href: "/filho/checklist", label: "O que fazer", icon: ListChecks },
  { href: "/filho/loja", label: "Loja", icon: Package },
  { href: "/filho/mensagens", label: "Falar com o Pai", icon: MessageCircle },
  { href: "/filho/financeiro-chat", label: "Chat com o Financeiro", icon: Wallet },
  { href: "/filho/notificacoes", label: "Notificações", icon: Bell },
] as const;

export default function FilhoContaPage() {
  const { currentUser, state, logout } = useAppStore();
  const router = useRouter();

  if (!currentUser || !isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  const unread = unreadCountForRole(state.notifications, "cliente", {
    clientId: currentUser.client_id,
  });

  return (
    <div className="animate-rise mx-auto max-w-md space-y-5">
      <div className="flex items-center gap-4">
        <BrandMark className="h-16 w-16 shrink-0" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gold-deep">
            App do Filho de Santo
          </p>
          <h1 className="font-display text-2xl text-navy">Menu</h1>
        </div>
      </div>

      <InstallAppBanner force />
      <EnablePushBanner forClient />

      <nav className="space-y-1">
        {appLinks.map((link) => {
          const Icon = link.icon;
          const showBadge = link.href === "/filho/notificacoes" && unread > 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-navy/70 transition hover:bg-navy/5"
            >
              <Icon className="h-5 w-5 shrink-0 text-gold-deep" />
              <span className="flex-1">{link.label}</span>
              {showBadge ? (
                <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => {
          logout();
          router.replace("/");
        }}
      >
        Sair da conta
      </Button>
    </div>
  );
}
