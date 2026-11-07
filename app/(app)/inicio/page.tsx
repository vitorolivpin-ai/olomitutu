"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminOverview } from "@/components/house/admin-overview";
import { PaiHome } from "@/components/house/pai-home";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";

export default function CasaInicioPage() {
  const { currentUser } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role === "estoque") router.replace("/estoque");
    if (currentUser?.role === "biblioteca") router.replace("/biblioteca");
  }, [currentUser?.role, router]);

  if (!currentUser || currentUser.role === "cliente") {
    return <EmptyState title="Área da casa" />;
  }

  if (currentUser.role === "pai_de_santo") {
    return <PaiHome />;
  }

  if (currentUser.role === "estoque" || currentUser.role === "biblioteca") {
    return (
      <EmptyState
        title="Abrindo sua área…"
        description="Redirecionando para o módulo do seu perfil."
      />
    );
  }

  // Administrador e Financeiro: overview só com os módulos permitidos
  return <AdminOverview />;
}
