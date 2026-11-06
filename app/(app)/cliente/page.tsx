"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  MessageCircle,
  Bell,
  UserRound,
  GraduationCap,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isFilhoDeSanto, isClienteDeJogo } from "@/lib/filho";

const shortcuts = [
  {
    href: "/cliente/cursos",
    label: "Meus cursos",
    icon: GraduationCap,
    hint: "Conteúdos liberados na sua conta",
  },
  {
    href: "/cliente/horarios",
    label: "Agenda",
    icon: CalendarDays,
    hint: "Ver e marcar horários",
  },
  {
    href: "/cliente/mensagens",
    label: "Chat com Vitor Cardozo - Ògún Yande",
    icon: MessageCircle,
    hint: "Conversa direta com o Pai",
  },
  {
    href: "/cliente/notificacoes",
    label: "Notificações",
    icon: Bell,
    hint: "Avisos da casa",
  },
  {
    href: "/cliente/cadastro",
    label: "Meu cadastro",
    icon: UserRound,
    hint: "Dados da conta",
  },
] as const;

export default function ClienteHomePage() {
  const { state, currentUser } = useAppStore();

  if (!currentUser || currentUser.role !== "cliente" || isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  if (!isClienteDeJogo(currentUser)) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  const clientId = currentUser.client_id;
  const unlocked = (state.shopPurchases ?? []).filter(
    (p) => p.client_id === clientId && p.status === "pago_liberado",
  ).length;
  const upcoming = (state.appointments ?? []).filter(
    (a) =>
      a.client_id === clientId &&
      a.status !== "CANCELADO" &&
      a.status !== "NAO_COMPARECEU" &&
      new Date(a.scheduled_at).getTime() >= Date.now() - 60 * 60 * 1000,
  ).length;

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <BrandMark className="h-20 w-20" priority />
        <div>
          <p className="text-sm font-medium text-gold-deep">App do Cliente</p>
          <h1 className="font-display text-3xl text-navy sm:text-4xl">
            Olá, {currentUser.full_name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            Cursos comprados, agenda e chat com Vitor Cardozo - Ògún Yande.
          </p>
        </div>
      </div>

      <InstallAppBanner force />
      <EnablePushBanner forClient />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-l-4 border-l-gold">
          <CardTitle className="text-lg">Cursos liberados</CardTitle>
          <p className="mt-2 text-sm text-navy/65">
            {unlocked > 0
              ? `${unlocked} conteúdo(s) disponível(is) na sua conta.`
              : "Ainda sem cursos liberados. Compre na loja e aguarde o Pix."}
          </p>
          <Link
            href="/cliente/cursos"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep"
          >
            <BookOpen className="h-4 w-4" />
            Abrir meus cursos
          </Link>
        </Card>
        <Card className="border-l-4 border-l-navy">
          <CardTitle className="text-lg">Agenda</CardTitle>
          <p className="mt-2 text-sm text-navy/65">
            {upcoming > 0
              ? `${upcoming} horário(s) marcado(s).`
              : "Nenhum horário à frente. Marque quando quiser."}
          </p>
          <Link
            href="/cliente/horarios"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy"
          >
            <CalendarDays className="h-4 w-4" />
            Ver agenda
          </Link>
        </Card>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:border-gold/40">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" />
                  <div>
                    <p className="font-medium text-navy">{item.label}</p>
                    <p className="text-xs text-navy/50">{item.hint}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>

      <p className="text-center text-xs text-navy/45">
        Quer só marcar sem conta? Use{" "}
        <Link href="/marcar" className="underline">
          Marcar horário
        </Link>{" "}
        no início.
      </p>
    </div>
  );
}
