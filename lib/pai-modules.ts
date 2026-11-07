import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  CalendarClock,
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
import type { AppModule } from "@/lib/permissions";

export type PaiModuleItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: AppModule;
};

export type PaiModuleGroup = {
  id: string;
  label: string;
  items: PaiModuleItem[];
};

/** Catálogo completo de módulos do Pai — Home “Todos os módulos” e sidebar. */
export const PAI_MODULE_GROUPS: PaiModuleGroup[] = [
  {
    id: "atendimento",
    label: "Atendimento",
    items: [
      { href: "/conversas", label: "Conversas", icon: MessageCircle, module: "chat" },
      { href: "/clientes", label: "Clientes de jogo", icon: Users, module: "clients" },
      { href: "/agenda", label: "Agenda", icon: CalendarDays, module: "agenda" },
      { href: "/disponibilidade", label: "Horários", icon: CalendarClock, module: "agenda" },
      { href: "/cadastros", label: "Cadastros", icon: UserCheck },
    ],
  },
  {
    id: "gestao",
    label: "Gestão da casa",
    items: [
      { href: "/membros", label: "Membros", icon: Users, module: "members" },
      { href: "/hierarquia", label: "Hierarquia", icon: Users, module: "house_content" },
      { href: "/checklist", label: "Checklist", icon: Receipt, module: "house_content" },
      { href: "/ajodun", label: "Ajodun", icon: CalendarDays, module: "house_content" },
      {
        href: "/ajodun/liberacoes",
        label: "Liberações de ajodun",
        icon: UserCheck,
        module: "house_content",
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    items: [
      { href: "/dashboard", label: "Resumo", icon: ChartColumn, module: "dashboard" },
      { href: "/mensalidades", label: "Mensalidades", icon: Receipt, module: "fees" },
      { href: "/cobrancas", label: "Cobranças", icon: CreditCard, module: "charges" },
      { href: "/despesas", label: "Despesas", icon: Wallet, module: "expenses" },
      { href: "/financeiro", label: "Financeiro", icon: ChartColumn, module: "finance" },
      { href: "/relatorios", label: "Relatórios", icon: ChartColumn, module: "reports" },
    ],
  },
  {
    id: "conteudo",
    label: "Conteúdo, Loja e Casa",
    items: [
      { href: "/estoque", label: "Estoque", icon: Package, module: "stock" },
      { href: "/biblioteca", label: "Biblioteca", icon: BookOpen, module: "library" },
      { href: "/loja", label: "Loja", icon: Package, module: "shop" },
      { href: "/loja/liberacoes", label: "Liberações da loja", icon: Package, module: "shop" },
      { href: "/conteudo", label: "Conteúdo da casa", icon: BookOpen, module: "house_content" },
      { href: "/educacao", label: "Educação", icon: BookOpen, module: "house_content" },
      { href: "/fotos", label: "Fotos", icon: BookOpen, module: "house_content" },
      { href: "/notificacoes", label: "Notificações", icon: Bell, module: "notifications" },
    ],
  },
];
