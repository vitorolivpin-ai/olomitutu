"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  MessageCircle,
  Package,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { CLIENT_WHATSAPP } from "@/lib/client-whatsapp";

const appLinks = [
  { href: "/cliente", label: "Quem somos", icon: LayoutDashboard },
  { href: "/cliente/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/cliente/loja", label: "Loja", icon: Package },
  { href: "/cliente/horarios", label: "Horários", icon: CalendarDays },
  { href: "/cliente/mensagens", label: "Falar com o Pai", icon: MessageCircle },
  { href: "/cliente/cadastro", label: "Meu cadastro", icon: UserRound },
] as const;

export default function ClienteContaPage() {
  const { currentUser, logout } = useAppStore();
  const router = useRouter();

  if (currentUser?.role !== "cliente") {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

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

      <nav className="space-y-1">
        {appLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-navy/70 transition hover:bg-navy/5"
            >
              <Icon className="h-5 w-5 shrink-0 text-gold-deep" />
              <span>{link.label}</span>
            </Link>
          );
        })}

        <a
          href={CLIENT_WHATSAPP.duvidas.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-navy/70 transition hover:bg-navy/5"
        >
          <WhatsAppIcon className="h-5 w-5 text-gold-deep" />
          <span>{CLIENT_WHATSAPP.duvidas.label}</span>
        </a>

        <a
          href={CLIENT_WHATSAPP.grupo.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-navy/70 transition hover:bg-navy/5"
        >
          <WhatsAppIcon className="h-5 w-5 shrink-0 text-gold-deep" />
          <span className="leading-snug">{CLIENT_WHATSAPP.grupo.label}</span>
        </a>
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
