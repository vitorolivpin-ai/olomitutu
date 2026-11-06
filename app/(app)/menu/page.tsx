"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/brand/logo";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { UserAvatar } from "@/components/profile/user-avatar";
import { useAppStore } from "@/hooks/use-app-store";
import { roleLabel, canAccess } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/client";


export default function MenuPage() {
  const { currentUser, logout, resetDemo } = useAppStore();
  const router = useRouter();

  function onLogout() {
    logout();
    router.replace("/");
  }

  const links = [
    ...(currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador"
      ? [{ href: "/cadastros", label: "Cadastros pendentes", module: "dashboard" as const }]
      : []),
    { href: "/membros", label: "Membros", module: "members" as const },
    { href: "/mensalidades", label: "Mensalidades", module: "fees" as const },
    { href: "/cobrancas", label: "Cobranças", module: "charges" as const },
    { href: "/despesas", label: "Despesas", module: "expenses" as const },
    { href: "/financeiro", label: "Análise financeira", module: "finance" as const },
    { href: "/clientes", label: "Clientes de jogo", module: "clients" as const },
    { href: "/estoque", label: "Estoque (código de barras)", module: "stock" as const },
    { href: "/biblioteca", label: "Biblioteca (vídeos, cantigas, PDFs)", module: "library" as const },
    { href: "/loja", label: "Loja (produtos à venda)", module: "shop" as const },
    {
      href: "/conteudo",
      label: "Conteúdo da casa (blog, educação, hierarquia…)",
      module: "house_content" as const,
    },
    { href: "/agenda", label: "Agenda", module: "agenda" as const },
    { href: "/disponibilidade", label: "Horários disponíveis", module: "agenda" as const },
    { href: "/conversas", label: "Conversas", module: "chat" as const },
    { href: "/relatorios", label: "Relatórios", module: "reports" as const },
    { href: "/notificacoes", label: "Notificações", module: "notifications" as const },
  ];

  return (
    <div className="animate-rise space-y-5">
      <div className="flex items-center gap-4">
        <BrandMark className="h-16 w-16" />
        <div>
          <h1 className="font-display text-3xl text-navy">Menu</h1>
          <p className="text-sm text-navy/60">ILÉ OLÓRÒKÈ ÀṢẸ · OLÓMÌ TÚTÙ</p>
        </div>
      </div>

      <InstallAppBanner />
      {(currentUser?.role === "pai_de_santo" ||
        currentUser?.role === "administrador") && <EnablePushBanner />}

      <Card>
        <div className="flex items-center gap-4">
          <UserAvatar
            name={currentUser?.full_name ?? "Usuário"}
            src={currentUser?.avatar_url}
            size="md"
          />
          <div className="min-w-0">
            <CardTitle className="truncate">{currentUser?.full_name}</CardTitle>
            <p className="mt-1 text-sm text-navy/65">
              {currentUser ? roleLabel(currentUser.role) : ""} · {currentUser?.email}
            </p>
          </div>
        </div>
        {currentUser?.role !== "cliente" ? (
          <Link href="/perfil" className="mt-4 block">
            <Button variant="gold" className="w-full">
              {currentUser?.role === "pai_de_santo"
                ? "Editar meu perfil (nome, foto, e-mail)"
                : "Editar meu perfil"}
            </Button>
          </Link>
        ) : null}
        <p className="mt-3 text-xs text-navy/50">
          Backend: {isSupabaseConfigured() ? "Supabase configurado" : "Modo demonstração local (localStorage)"}
        </p>
      </Card>

      <div className="grid gap-2">
        {links
          .filter((l) => canAccess(currentUser?.role, l.module))
          .map((l) => (
            <Link key={l.href} href={l.href}>
              <Button variant="secondary" className="w-full justify-start">
                {l.label}
              </Button>
            </Link>
          ))}
      </div>

      <div className="grid gap-2">
        {!isSupabaseConfigured() ? (
          <Button variant="ghost" onClick={resetDemo}>
            Restaurar dados demonstrativos
          </Button>
        ) : null}
        <Button variant="danger" onClick={onLogout}>
          Sair
        </Button>
      </div>
    </div>
  );
}
