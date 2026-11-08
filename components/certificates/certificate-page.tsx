"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, ImageDown, PenLine, Share2 } from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import {
  downloadCertificatePdf,
  downloadCertificatePng,
  ScaledCertificate,
  shareCertificate,
} from "@/components/certificates/certificate-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorMessage, LoadingBlock } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { useWorkshops } from "@/hooks/use-workshops";
import { certificateUrl, formatLongDate } from "@/lib/workshops";

export function CertificatePage({
  id,
  backHref,
  owner,
}: {
  id: string;
  backHref: string;
  /** Visão do dono (cliente/filho): pode pedir correção de nome. */
  owner?: boolean;
}) {
  const { ready, certificates, myCertificates, markCertificateSeen, requestNameCorrection } =
    useWorkshops();
  const artRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"" | "pdf" | "png" | "share">("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [fixOpen, setFixOpen] = useState(false);
  const [fixName, setFixName] = useState("");

  const cert = (owner ? myCertificates : certificates).find((c) => c.id === id);

  useEffect(() => {
    if (owner && cert && !cert.seen_at) markCertificateSeen(cert.id);
  }, [owner, cert, markCertificateSeen]);

  if (!ready) return <LoadingBlock />;
  if (!cert) {
    return (
      <div className="space-y-5">
        <BrandPageHeader title="Certificado" backHref={backHref} />
        <EmptyState title="Certificado não encontrado" />
      </div>
    );
  }

  async function run(kind: "pdf" | "png" | "share") {
    if (!artRef.current || !cert) return;
    setBusy(kind);
    setMsg("");
    setError("");
    try {
      if (kind === "pdf") await downloadCertificatePdf(artRef.current, cert);
      else if (kind === "png") await downloadCertificatePng(artRef.current, cert);
      else {
        const r = await shareCertificate(artRef.current, cert);
        if (r === "copied") setMsg("Link de verificação copiado.");
      }
    } catch {
      setError("Não foi possível gerar o arquivo. Tente novamente.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title={cert.kind === "oficina" ? "Certificado de participação" : "Certificado de conclusão"}
        subtitle={`${cert.title} · ${formatLongDate(cert.completed_on)}`}
        backHref={backHref}
        backLabel="Certificados"
      />

      <ScaledCertificate cert={cert} artRef={artRef} />

      {cert.status === "revogado" ? (
        <ErrorMessage message="Este certificado foi revogado e não é mais válido." />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="primary" disabled={!!busy} onClick={() => void run("pdf")}>
          <Download className="h-5 w-5" /> {busy === "pdf" ? "Gerando…" : "Baixar PDF"}
        </Button>
        <Button variant="secondary" disabled={!!busy} onClick={() => void run("png")}>
          <ImageDown className="h-5 w-5" /> {busy === "png" ? "Gerando…" : "Baixar imagem"}
        </Button>
        <Button variant="gold" disabled={!!busy} onClick={() => void run("share")}>
          <Share2 className="h-5 w-5" /> {busy === "share" ? "Preparando…" : "Compartilhar"}
        </Button>
      </div>

      {msg ? <p className="text-center text-sm text-success">{msg}</p> : null}
      {error ? <ErrorMessage message={error} /> : null}

      <Card className="space-y-2 text-sm text-navy/75">
        <p>
          Código de verificação: <strong className="text-navy">{cert.code}</strong>
        </p>
        <a
          href={certificateUrl(cert.code)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-gold-deep underline"
        >
          Abrir página de verificação <ExternalLink className="h-4 w-4" />
        </a>
        {owner ? (
          <div className="border-t border-navy/10 pt-3">
            {!fixOpen ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 font-semibold text-navy/70 hover:text-navy"
                onClick={() => {
                  setFixName(cert.printed_name);
                  setFixOpen(true);
                }}
              >
                <PenLine className="h-4 w-4" /> O nome está errado? Pedir correção
              </button>
            ) : (
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await requestNameCorrection(cert.id, fixName);
                  if (!r.ok) setError(r.error);
                  else {
                    setFixOpen(false);
                    setMsg("Pedido enviado. A casa reemite o certificado com o nome correto.");
                  }
                }}
              >
                <Label htmlFor="fix-nome">Nome correto</Label>
                <Input id="fix-nome" value={fixName} onChange={(e) => setFixName(e.target.value)} required />
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setFixOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" variant="primary">
                    Enviar pedido
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <p className="text-xs text-navy/50">
            Emitido por {cert.issued_by_name ?? "—"} · {cert.email ?? "sem conta vinculada"}
          </p>
        )}
      </Card>

      {!owner ? (
        <Link href="/certificados" className="block text-center text-sm font-semibold text-navy/60">
          Voltar para a lista
        </Link>
      ) : null}
    </div>
  );
}
