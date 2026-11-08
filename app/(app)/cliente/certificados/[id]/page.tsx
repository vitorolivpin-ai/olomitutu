"use client";

import { useParams } from "next/navigation";
import { CertificatePage } from "@/components/certificates/certificate-page";

export default function MeuCertificadoPage() {
  const params = useParams<{ id: string }>();
  return <CertificatePage id={params.id} backHref="/cliente/certificados" owner />;
}
