"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ListChecks,
  MessageCircle,
  Package,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { memberForProfile } from "@/lib/ensure-filho-member";
import { isFilhoDeSanto } from "@/lib/filho";
import { formatCurrency } from "@/lib/format";
import { CHECKLIST_LEVEL_LABEL } from "@/lib/house-content";

const shortcuts = [
  { href: "/filho/mensalidade", label: "Mensalidade", icon: Wallet, hint: "Pagar e ver recibos" },
  { href: "/filho/educacao", label: "Educação", icon: BookOpen, hint: "Livros, vídeos e mais" },
  { href: "/filho/biblioteca", label: "Biblioteca", icon: BookOpen, hint: "Cantigas e PDFs" },
  { href: "/filho/ajodun", label: "Ajodun", icon: CalendarDays, hint: "Pedido e planilha" },
  { href: "/filho/hierarquia", label: "Hierarquia", icon: Users, hint: "Organograma da casa" },
  { href: "/filho/checklist", label: "O que fazer", icon: ListChecks, hint: "Abian até cargos" },
  { href: "/filho/loja", label: "Loja", icon: Package, hint: "Comprar produtos" },
  {
    href: "/filho/mensagens",
    label: "Chat com Vitor Cardozo - Ògún Yande",
    icon: MessageCircle,
    hint: "Conversa direta",
  },
  {
    href: "/filho/financeiro-chat",
    label: "Chat Financeiro",
    icon: Receipt,
    hint: "Pix e liberações",
  },
] as const;

export default function FilhoHomePage() {
  const { state, currentUser } = useAppStore();

  if (!currentUser || !isFilhoDeSanto(currentUser)) {
    return <EmptyState title="Área exclusiva do Filho de Santo" />;
  }

  const user = currentUser;
  const member = memberForProfile(state.members, user.id);
  const openFees = (state.monthlyFees ?? []).filter(
    (f) =>
      f.member_id === member?.id &&
      (f.status === "AGUARDANDO" || f.status === "VENCIDO"),
  );

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <BrandMark className="h-20 w-20" priority />
        <div>
          <p className="text-sm font-medium text-gold-deep">App do Filho de Santo</p>
          <h1 className="font-display text-3xl text-navy sm:text-4xl">
            Olá, {user.full_name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            Educação, mensalidade, ajodun, hierarquia e loja num só lugar.
          </p>
        </div>
      </div>

      <InstallAppBanner force />
      <EnablePushBanner forClient />

      {member ? (
        <Card className="border-l-4 border-l-gold">
          <CardTitle>Sua mensalidade</CardTitle>
          <p className="mt-2 text-sm text-navy/70">
            Valor definido pelo Financeiro:{" "}
            <strong>{formatCurrency(member.monthly_fee_amount)}</strong> · dia {member.due_day}
          </p>
          {member.checklist_level ? (
            <p className="mt-1 text-xs text-navy/50">
              Nível: {CHECKLIST_LEVEL_LABEL[member.checklist_level]}
            </p>
          ) : null}
          {openFees.length > 0 ? (
            <p className="mt-3 text-sm text-amber-900">
              {openFees.length} cobrança(s) em aberto.
            </p>
          ) : (
            <p className="mt-3 text-sm text-navy/55">Nenhuma cobrança em aberto no momento.</p>
          )}
          <Link href="/filho/mensalidade" className="mt-4 block">
            <Button variant="gold" className="w-full">
              Ver mensalidade
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-navy/65">
            Seu cadastro financeiro ainda está sendo preparado. O Financeiro define o valor da
            mensalidade.
          </p>
        </Card>
      )}

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
    </div>
  );
}
