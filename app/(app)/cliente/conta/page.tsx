"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isClienteDeJogo, isFilhoDeSanto } from "@/lib/filho";
import { unreadCountForRole } from "@/lib/notifications";

const appLinks = [
  { href: "/cliente", label: "Início", icon: CalendarDays },
  { href: "/cliente/cursos", label: "Meus cursos", icon: BookOpen },
  { href: "/cliente/horarios", label: "Agenda", icon: CalendarDays },
  {
    href: "/cliente/mensagens",
    label: "Chat com Vitor Cardozo - Ògún Yande",
    icon: MessageCircle,
  },
  { href: "/cliente/notificacoes", label: "Notificações", icon: Bell },
  { href: "/cliente/cadastro", label: "Meu cadastro", icon: UserRound },
] as const;

export default function ClienteContaPage() {
  const { currentUser, state, logout } = useAppStore();
  const router = useRouter();

  if (
    currentUser?.role !== "cliente" ||
    isFilhoDeSanto(currentUser) ||
    !isClienteDeJogo(currentUser)
  ) {
    return <EmptyState title="Área exclusiva do cliente" />;
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
            App do Cliente
          </p>
          <h1 className="font-display text-2xl text-navy">Menu</h1>
        </div>
      </div>

      <InstallAppBanner force />
      <EnablePushBanner forClient />

      <nav className="space-y-1">
        {appLinks.map((link) => {
          const Icon = link.icon;
          const showBadge = link.href === "/cliente/notificacoes" && unread > 0;
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
