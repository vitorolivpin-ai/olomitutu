"use client";

import { PaiHome } from "@/components/house/pai-home";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isHouseStaffRole } from "@/lib/permissions";

export default function CasaInicioPage() {
  const { currentUser } = useAppStore();

  if (!currentUser || currentUser.role === "cliente") {
    return <EmptyState title="Área da casa" />;
  }

  // Mesma home operacional do Pai para todas as abas da casa
  if (isHouseStaffRole(currentUser.role)) {
    return <PaiHome />;
  }

  return <EmptyState title="Área da casa" />;
}
