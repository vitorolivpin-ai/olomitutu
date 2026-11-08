"use client";

import { useParams } from "next/navigation";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { EmptyState, LoadingBlock } from "@/components/ui/empty-state";
import { WorkshopForm } from "@/components/workshops/workshop-form";
import { useWorkshops } from "@/hooks/use-workshops";

export default function EditarOficinaPage() {
  const params = useParams<{ id: string }>();
  const { canManage, workshops, ready } = useWorkshops();
  if (!canManage) return <EmptyState title="Acesso restrito ao Pai de Santo e Administrador" />;
  if (!ready) return <LoadingBlock />;
  const w = workshops.find((x) => x.id === params.id);
  if (!w) return <EmptyState title="Oficina não encontrada" />;
  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Editar oficina"
        subtitle={w.updated_by_name ? `Última edição: ${w.updated_by_name}` : undefined}
        backHref="/gestao-oficinas"
        backLabel="Oficinas"
      />
      <WorkshopForm key={w.id} initial={w} />
    </div>
  );
}
