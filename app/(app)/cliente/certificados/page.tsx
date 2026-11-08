"use client";

import { MyCertificates } from "@/components/certificates/my-certificates";

export default function MeusCertificadosPage() {
  return <MyCertificates base="/cliente/certificados" backHref="/cliente" />;
}
