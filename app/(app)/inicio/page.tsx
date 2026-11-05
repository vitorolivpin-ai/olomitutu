"use client";

import Link from "next/link";
import { AdminOverview } from "@/components/house/admin-overview";
import { QuemSomosHome } from "@/components/house/quem-somos-home";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { canAccess } from "@/lib/permissions";
import type { HomeTrail } from "@/components/house/quem-somos-home";

export default function CasaInicioPage() {
  const { currentUser } = useAppStore();

  if (!currentUser || currentUser.role === "cliente") {
    return <EmptyState title="Área da casa" />;
  }

  // Administrador: overview geral — sem Quem somos
  if (currentUser.role === "administrador" || currentUser.role === "tesouraria") {
    return <AdminOverview />;
  }

  // Pai de Santo: Quem somos (aba exclusiva dele) + atalhos
  const trails: HomeTrail[] = [
    canAccess(currentUser.role, "agenda")
      ? {
          id: "agenda",
          label: "Agenda",
          hint: "Atendimentos e horários",
          href: "/agenda",
          tone: "navy" as const,
        }
      : null,
    canAccess(currentUser.role, "chat")
      ? {
          id: "conversas",
          label: "Conversas",
          hint: "Mensagens com clientes",
          href: "/conversas",
          tone: "gold" as const,
        }
      : null,
    canAccess(currentUser.role, "house_content")
      ? {
          id: "conteudo",
          label: "Conteúdo da casa",
          hint: "Educação, hierarquia, checklist, ajodun, fotos",
          href: "/conteudo",
          tone: "gold" as const,
        }
      : null,
    canAccess(currentUser.role, "library")
      ? {
          id: "biblioteca",
          label: "Biblioteca",
          hint: "Cantigas, vídeos e PDFs",
          href: "/biblioteca",
          tone: "leaf" as const,
        }
      : null,
    canAccess(currentUser.role, "clients")
      ? {
          id: "clientes",
          label: "Clientes",
          hint: "Cadastro de atendimentos",
          href: "/clientes",
          tone: "navy" as const,
        }
      : null,
    {
      id: "menu",
      label: "Conta / Menu",
      hint: "Sair ou restaurar demonstração",
      href: "/menu",
      tone: "navy" as const,
    },
  ].filter(Boolean) as HomeTrail[];

  return (
    <QuemSomosHome
      eyebrow="Pai de Santo · Quem somos"
      trailsTitle="Seus caminhos"
      trails={trails}
      footer={
        <div className="mt-3">
          <Link href="/">
            <Button variant="ghost" className="w-full">
              Menu principal
            </Button>
          </Link>
        </div>
      }
    />
  );
}
