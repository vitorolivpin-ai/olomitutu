"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkshopForm } from "@/components/workshops/workshop-form";
import { useWorkshops } from "@/hooks/use-workshops";

export default function NovaOficinaPage() {
  const { canManage } = useWorkshops();
  if (!canManage) return <EmptyState title="Acesso restrito ao Pai de Santo e Administrador" />;
  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Nova oficina"
        subtitle="Cadastro próprio das oficinas — não entra na Loja."
        backHref="/gestao-oficinas"
        backLabel="Oficinas"
      />
      <WorkshopForm />
    </div>
  );
}
