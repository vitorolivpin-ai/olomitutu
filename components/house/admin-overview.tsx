"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  CreditCard,
  MessageCircle,
  Package,
  Receipt,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { Card, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";
import { dashboardMetrics } from "@/lib/finance";
import {
  currentCompetence,
  formatCompetence,
  formatCurrency,
  signedCurrency,
} from "@/lib/format";
import { canAccess } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Tile = {
  href: string;
  label: string;
  hint: string;
  icon: typeof Users;
  module?: Parameters<typeof canAccess>[1];
  tone: "navy" | "gold" | "leaf";
};

const toneBorder = {
  navy: "border-l-navy",
  gold: "border-l-gold",
  leaf: "border-l-leaf",
};

const tiles: Tile[] = [
  {
    href: "/cadastros",
    label: "Cadastros",
    hint: "Aceitar acessos da casa",
    icon: UserCheck,
    tone: "gold",
  },
  {
    href: "/dashboard",
    label: "Resumo",
    hint: "Indicadores do mês",
    icon: ChartColumn,
    module: "dashboard",
    tone: "navy",
  },
  {
    href: "/membros",
    label: "Membros",
    hint: "Cadastro da casa",
    icon: Users,
    module: "members",
    tone: "navy",
  },
  {
    href: "/mensalidades",
    label: "Mensalidades",
    hint: "Competências e status",
    icon: Receipt,
    module: "fees",
    tone: "gold",
  },
  {
    href: "/cobrancas",
    label: "Cobranças",
    hint: "Recebimentos",
    icon: CreditCard,
    module: "charges",
    tone: "gold",
  },
  {
    href: "/despesas",
    label: "Despesas",
    hint: "Contas a pagar",
    icon: Wallet,
    module: "expenses",
    tone: "navy",
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    hint: "Análise e saldo",
    icon: ChartColumn,
    module: "finance",
    tone: "gold",
  },
  {
    href: "/clientes",
    label: "Clientes de jogo",
    hint: "Atendimentos externos",
    icon: Users,
    module: "clients",
    tone: "navy",
  },
  {
    href: "/agenda",
    label: "Agenda",
    hint: "Horários e jogos",
    icon: CalendarDays,
    module: "agenda",
    tone: "navy",
  },
  {
    href: "/disponibilidade",
    label: "Horários",
    hint: "Slots publicados",
    icon: CalendarDays,
    module: "agenda",
    tone: "navy",
  },
  {
    href: "/conversas",
    label: "Conversas",
    hint: "Chat com clientes",
    icon: MessageCircle,
    module: "chat",
    tone: "gold",
  },
  {
    href: "/estoque",
    label: "Estoque",
    hint: "Código de barras",
    icon: Package,
    module: "stock",
    tone: "leaf",
  },
  {
    href: "/biblioteca",
    label: "Biblioteca",
    hint: "Vídeos, cantigas, PDFs",
    icon: BookOpen,
    module: "library",
    tone: "leaf",
  },
  {
    href: "/loja",
    label: "Loja",
    hint: "Produtos à venda",
    icon: Package,
    module: "shop",
    tone: "gold",
  },
  {
    href: "/loja/liberacoes",
    label: "Liberações da loja",
    hint: "PDF, curso e Pix",
    icon: Package,
    module: "shop",
    tone: "gold",
  },
  {
    href: "/conteudo",
    label: "Conteúdo da casa",
    hint: "Educação, hierarquia, ajodun…",
    icon: BookOpen,
    module: "house_content",
    tone: "leaf",
  },
  {
    href: "/educacao",
    label: "Educação",
    hint: "Livros e materiais",
    icon: BookOpen,
    module: "house_content",
    tone: "leaf",
  },
  {
    href: "/hierarquia",
    label: "Hierarquia",
    hint: "Organograma",
    icon: Users,
    module: "house_content",
    tone: "navy",
  },
  {
    href: "/checklist",
    label: "Checklist",
    hint: "Abian até cargos",
    icon: Receipt,
    module: "house_content",
    tone: "navy",
  },
  {
    href: "/ajodun",
    label: "Ajodun",
    hint: "Eventos e planilhas",
    icon: CalendarDays,
    module: "house_content",
    tone: "gold",
  },
  {
    href: "/ajodun/liberacoes",
    label: "Liberações de ajodun",
    hint: "Aprovar pedidos",
    icon: UserCheck,
    module: "house_content",
    tone: "gold",
  },
  {
    href: "/fotos",
    label: "Fotos",
    hint: "Álbuns da casa",
    icon: BookOpen,
    module: "house_content",
    tone: "leaf",
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    hint: "Visão geral",
    icon: ChartColumn,
    module: "reports",
    tone: "navy",
  },
  {
    href: "/notificacoes",
    label: "Notificações",
    hint: "Avisos da casa",
    icon: MessageCircle,
    module: "notifications",
    tone: "navy",
  },
];

/**
 * Overview da casa — Admin e Pai (todas as abas, sem App do Cliente).
 */
export function AdminOverview() {
  const { state, currentUser } = useAppStore();
  const competence = currentCompetence();
  const metrics = dashboardMetrics(state, competence);
  const isPai = currentUser?.role === "pai_de_santo";
  const showFinance =
    canAccess(currentUser?.role, "finance") || canAccess(currentUser?.role, "fees");

  const visible = tiles.filter(
    (t) => !t.module || canAccess(currentUser?.role, t.module),
  );

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <BrandMark className="h-16 w-16 sm:h-20 sm:w-20" priority />
        <div>
          <p className="text-sm font-medium text-gold-deep">
            {isPai ? "Pai de Santo" : "Administrador"}
          </p>
          <h1 className="font-display text-3xl text-navy sm:text-4xl">
            {isPai ? "Acesso à casa" : "Overview"}
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            {isPai
              ? "Todas as abas do app (exceto área do cliente) · "
              : "Visão geral do que há na casa · "}
            {formatCompetence(competence)}
          </p>
        </div>
      </div>

      {isPai ? (
        <Link
          href="/quem-somos"
          className="flex gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 transition hover:border-gold/60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-navy">
            <BookOpen className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-lg text-navy">Quem somos</span>
            <span className="block text-xs text-navy/55">
              História da casa e do Pai — editar no Conteúdo
            </span>
          </span>
        </Link>
      ) : null}

      {showFinance ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Recebidas" value={formatCurrency(metrics.received)} />
          <Kpi label="Em atraso" value={formatCurrency(metrics.overdueAmount)} danger />
          <Kpi label="Despesas" value={formatCurrency(metrics.expenseTotal)} />
          <Kpi label="Saldo do mês" value={signedCurrency(metrics.balance)} />
        </div>
      ) : null}

      <section>
        <h2 className="font-display text-xl text-navy">Módulos</h2>
        <p className="mt-1 text-sm text-navy/55">Toque para abrir cada área</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((tile) => {
            const Icon = tile.icon;
            return (
              <li key={tile.href}>
                <Link
                  href={tile.href}
                  className={cn(
                    "flex gap-3 rounded-2xl border border-navy/10 bg-white/80 p-4 transition hover:border-gold/35 hover:bg-white",
                    "border-l-4",
                    toneBorder[tile.tone],
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-navy">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg text-navy">{tile.label}</span>
                    <span className="block text-xs text-navy/55">{tile.hint}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {!isPai ? (
        <Card>
          <CardTitle>Acesso do Pai de Santo</CardTitle>
          <p className="mt-2 text-sm text-navy/65">
            A história da casa (Quem somos) também fica na área do Pai — com o mesmo
            acesso a todas as abas da casa.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card className={cn(danger && "border-l-4 border-l-danger")}>
      <p className="text-xs font-medium uppercase tracking-wide text-navy/50">{label}</p>
      <p className="mt-1 font-display text-2xl text-navy">{value}</p>
    </Card>
  );
}
