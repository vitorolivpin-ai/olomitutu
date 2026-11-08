"use client";

import { useParams } from "next/navigation";
import { CertificatePage } from "@/components/certificates/certificate-page";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkshops } from "@/hooks/use-workshops";

export default function CertificadoStaffViewPage() {
  const params = useParams<{ id: string }>();
  const { canManage } = useWorkshops();
  if (!canManage) return <EmptyState title="Acesso restrito ao Pai de Santo e Administrador" />;
  return <CertificatePage id={params.id} backHref="/certificados" />;
}
