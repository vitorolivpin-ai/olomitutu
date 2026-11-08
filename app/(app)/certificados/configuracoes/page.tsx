"use client";

import { FormEvent, useState } from "react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { ScaledCertificate } from "@/components/certificates/certificate-view";
import { SignaturePad } from "@/components/certificates/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage, LoadingBlock } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { useWorkshops } from "@/hooks/use-workshops";
import { todayYmd } from "@/lib/workshops";
import type { CertificateSettings } from "@/types";

function Form({ initial }: { initial: CertificateSettings }) {
  const { saveSettings } = useWorkshops();
  const [s, setS] = useState<CertificateSettings>(initial);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setSaving(true);
    const r = await saveSettings(s);
    setSaving(false);
    if (!r.ok) setError(r.error);
    else setMsg("Salvo. Os próximos certificados já saem com estes dados.");
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <Card className="space-y-4">
        <CardTitle className="text-xl">Quem assina</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-nome">Nome do Pai de Santo</Label>
            <Input
              id="s-nome"
              value={s.signer_name}
              onChange={(e) => setS({ ...s, signer_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="s-cargo">Cargo</Label>
            <Input
              id="s-cargo"
              value={s.signer_title}
              onChange={(e) => setS({ ...s, signer_title: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="s-2">Segunda assinatura (lado direito)</Label>
            <Input
              id="s-2"
              value={s.second_signer_label}
              onChange={(e) => setS({ ...s, second_signer_label: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-xl">Assinatura</CardTitle>
        <p className="text-sm text-navy/65">
          Desenhe uma vez aqui (no celular, com o dedo) ou envie a foto da assinatura no papel. Ela é
          aplicada automaticamente em todos os certificados emitidos depois.
        </p>
        <SignaturePad
          value={s.signature_data_url}
          onChange={(v) => setS({ ...s, signature_data_url: v })}
        />
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-xl">Regras</CardTitle>
        <label className="flex items-start justify-between gap-3 rounded-2xl bg-mist/60 p-3">
          <span>
            <span className="block text-sm font-semibold text-navy">Liberar certificados ao encerrar</span>
            <span className="block text-xs text-navy/55">
              Quando a oficina for marcada como “Encerrada”, quem estiver “Presente” recebe na hora.
            </span>
          </span>
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-[#0b326b]"
            checked={s.auto_release_on_close}
            onChange={(e) => setS({ ...s, auto_release_on_close: e.target.checked })}
          />
        </label>
        <label className="flex items-start justify-between gap-3 rounded-2xl bg-mist/60 p-3">
          <span>
            <span className="block text-sm font-semibold text-navy">
              Pai de Santo pode excluir oficinas de outras pessoas
            </span>
            <span className="block text-xs text-navy/55">O Administrador sempre pode.</span>
          </span>
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-[#0b326b]"
            checked={s.pai_can_delete_any}
            onChange={(e) => setS({ ...s, pai_can_delete_any: e.target.checked })}
          />
        </label>
      </Card>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-navy">Prévia</h2>
        <ScaledCertificate
          cert={{
            code: "OLT-0000-000000",
            kind: "oficina",
            printed_name: "Nome da Pessoa Participante",
            title: "Ervas e Banhos Sagrados",
            completed_on: todayYmd(),
            modality: "presencial",
            workload: "3 horas",
            signer_name: s.signer_name || "Nome do Pai de Santo",
            signer_title: s.signer_title,
            second_signer_label: s.second_signer_label,
            signature_data_url: s.signature_data_url,
            issued_at: new Date().toISOString(),
          }}
        />
      </section>

      {msg ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">{msg}</p>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}
      <div className="sticky bottom-3 z-10 rounded-3xl bg-background/90 p-2 backdrop-blur">
        <Button type="submit" variant="gold" className="w-full" disabled={saving}>
          {saving ? "Salvando…" : "Salvar configurações"}
        </Button>
      </div>
      <p className="text-center text-xs text-navy/50">
        Certificados já emitidos guardam a assinatura da época. Para trocar em um antigo, use “Reemitir”.
      </p>
    </form>
  );
}

export default function CertificadoConfigPage() {
  const { ready, canManage, settings } = useWorkshops();
  if (!canManage) return <EmptyState title="Acesso restrito ao Pai de Santo e Administrador" />;
  if (!ready) return <LoadingBlock />;
  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Assinatura e configurações"
        subtitle="Dados que entram automaticamente nos certificados."
        backHref="/certificados"
        backLabel="Certificados"
      />
      <Form initial={settings} />
    </div>
  );
}
