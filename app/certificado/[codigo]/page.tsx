"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { Card } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/empty-state";
import { useWorkshops } from "@/hooks/use-workshops";
import { createBrowserClient } from "@/lib/supabase/client";
import { verifyCertificateRemote, type PublicCertificate } from "@/lib/supabase/workshops";
import { formatLongDate, MODALITY_LABEL } from "@/lib/workshops";

/** Página pública aberta pelo QR code do certificado. */
export default function VerificarCertificadoPage() {
  const params = useParams<{ codigo: string }>();
  const code = decodeURIComponent(params.codigo ?? "").toUpperCase();
  const { cloud, certificates, ready } = useWorkshops();
  const [remote, setRemote] = useState<PublicCertificate | null | undefined>(undefined);

  useEffect(() => {
    if (!cloud) return;
    const supabase = createBrowserClient();
    if (!supabase) return;
    void verifyCertificateRemote(supabase, code).then(setRemote);
  }, [cloud, code]);

  const local = certificates.find((c) => c.code.toUpperCase() === code);
  const cert: PublicCertificate | null | undefined = cloud ? remote : ready ? (local ?? null) : undefined;

  return (
    <BrandPageShell>
      <BrandPageHeader title="Verificar certificado" subtitle={code} backHref="/" />
      <div className="mt-5">
        {cert === undefined ? (
          <LoadingBlock label="Verificando…" />
        ) : cert === null ? (
          <Card className="text-center">
            <ShieldX className="mx-auto h-12 w-12 text-danger" />
            <h2 className="mt-3 font-display text-2xl text-navy">Certificado não encontrado</h2>
            <p className="mt-2 text-navy/70">
              Confira o código. Em caso de dúvida, fale com a casa.
            </p>
          </Card>
        ) : (
          <Card>
            <div className="text-center">
              {cert.status === "disponivel" ? (
                <BadgeCheck className="mx-auto h-12 w-12 text-success" />
              ) : (
                <ShieldAlert className="mx-auto h-12 w-12 text-danger" />
              )}
              <h2 className="mt-3 font-display text-2xl text-navy">
                {cert.status === "disponivel" ? "Certificado válido" : "Certificado revogado"}
              </h2>
              {cert.status !== "disponivel" ? (
                <p className="mt-1 text-sm text-navy/65">
                  Este documento foi cancelado ou substituído pela casa.
                </p>
              ) : null}
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              {[
                ["Nome", cert.printed_name],
                [cert.kind === "oficina" ? "Oficina" : "Curso", cert.title],
                [
                  cert.kind === "oficina" ? "Realizada em" : "Concluído em",
                  formatLongDate(cert.completed_on),
                ],
                ["Modalidade", MODALITY_LABEL[cert.modality as "presencial" | "online"] ?? cert.modality],
                ...(cert.workload ? [["Carga horária", cert.workload]] : []),
                ["Assinado por", `${cert.signer_name} — ${cert.signer_title}`],
                ["Emitido em", new Date(cert.issued_at).toLocaleDateString("pt-BR")],
                ["Código", cert.code],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-mist/60 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gold-deep">{k}</dt>
                  <dd className="mt-0.5 text-navy">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-center text-xs text-navy/50">
              Ilé Olóròkè Àṣẹ Olómi Tútù · verificação oficial
            </p>
          </Card>
        )}
      </div>
    </BrandPageShell>
  );
}
