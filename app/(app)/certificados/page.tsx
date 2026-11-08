"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Award, Eye, PenLine, RotateCcw, Search, Settings, ShieldX } from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage, LoadingBlock } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { useWorkshops } from "@/hooks/use-workshops";
import { formatLongDate, todayYmd } from "@/lib/workshops";
import type { CertificateKind, WorkshopModality } from "@/types";

export default function CertificadosStaffPage() {
  const { state } = useAppStore();
  const {
    ready,
    canManage,
    certificates,
    workshops,
    corrections,
    settings,
    issueManualCertificate,
    revokeCertificate,
    reissueCertificate,
    resolveCorrection,
  } = useWorkshops();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const [kind, setKind] = useState<CertificateKind>("curso");
  const [refId, setRefId] = useState("");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(todayYmd());
  const [modality, setModality] = useState<WorkshopModality>("online");
  const [workload, setWorkload] = useState("");

  const courses = useMemo(
    () => (state.shopProducts ?? []).filter((p) => (p.kind ?? "fisico") === "curso"),
    [state.shopProducts],
  );

  // Pré-preenchimento vindo de “Liberações da loja” → Emitir certificado
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const curso = sp.get("curso");
    if (!curso && !sp.get("nome")) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setOpen(true);
    setKind("curso");
    if (curso) {
      setRefId(curso);
      const p = (state.shopProducts ?? []).find((x) => x.id === curso);
      if (p) setTitle(p.name);
    }
    setName(sp.get("nome") ?? "");
    setEmail(sp.get("email") ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state.shopProducts]);

  if (!canManage) return <EmptyState title="Acesso restrito ao Pai de Santo e Administrador" />;
  if (!ready) return <LoadingBlock />;

  const t = q.trim().toLowerCase();
  const list = certificates
    .filter(
      (c) =>
        !t ||
        c.printed_name.toLowerCase().includes(t) ||
        c.title.toLowerCase().includes(t) ||
        c.code.toLowerCase().includes(t) ||
        (c.email ?? "").includes(t),
    )
    .slice()
    .sort((a, b) => b.issued_at.localeCompare(a.issued_at));
  const pending = corrections.filter((c) => c.status === "pendente");

  function pickRef(id: string) {
    setRefId(id);
    if (kind === "curso") {
      const p = courses.find((x) => x.id === id);
      if (p) setTitle(p.name);
    } else {
      const w = workshops.find((x) => x.id === id);
      if (w) {
        setTitle(w.title);
        setModality(w.modality);
        if (w.date) setDate(w.date);
        setWorkload(w.workload ?? "");
      }
    }
  }

  async function onIssue(e: FormEvent) {
    e.preventDefault();
    setError("");
    const r = await issueManualCertificate({
      kind,
      printed_name: name,
      email,
      title,
      reference_id: refId || undefined,
      completed_on: date,
      modality,
      workload,
    });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setMsg(`Certificado ${r.data?.code} emitido para ${r.data?.printed_name}.`);
    setOpen(false);
    setName("");
    setEmail("");
    window.history.replaceState(null, "", "/certificados");
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Certificados"
        subtitle="Oficinas e cursos. A assinatura do Pai de Santo entra automaticamente."
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="gold" size="md" onClick={() => setOpen((v) => !v)}>
          <Award className="h-4 w-4" /> Emitir certificado
        </Button>
        <Link href="/certificados/configuracoes">
          <Button variant="secondary" size="md">
            <PenLine className="h-4 w-4" /> Assinatura e configurações
          </Button>
        </Link>
      </div>

      {!settings.signature_data_url ? (
        <Card className="flex flex-col gap-2 border-gold/40 bg-gold/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-navy/80">
            A assinatura do Pai de Santo ainda não foi cadastrada. Os certificados saem só com o nome.
          </p>
          <Link href="/certificados/configuracoes">
            <Button size="sm" variant="primary">
              <Settings className="h-4 w-4" /> Cadastrar agora
            </Button>
          </Link>
        </Card>
      ) : null}

      {msg ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">{msg}</p>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}

      {open ? (
        <Card>
          <CardTitle className="text-xl">Emitir certificado</CardTitle>
          <p className="mt-1 text-sm text-navy/60">
            Use para cursos da loja concluídos ou para quem participou de uma oficina sem inscrição no app.
          </p>
          <form onSubmit={onIssue} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-tipo">Tipo</Label>
              <Select
                id="c-tipo"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as CertificateKind);
                  setRefId("");
                }}
              >
                <option value="curso">Conclusão de curso</option>
                <option value="oficina">Participação em oficina</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="c-ref">{kind === "curso" ? "Curso da loja" : "Oficina"}</Label>
              <Select id="c-ref" value={refId} onChange={(e) => pickRef(e.target.value)}>
                <option value="">Outro (digitar o nome)</option>
                {(kind === "curso" ? courses.map((c) => ({ id: c.id, n: c.name })) : workshops.map((w) => ({ id: w.id, n: w.title }))).map(
                  (o) => (
                    <option key={o.id} value={o.id}>
                      {o.n}
                    </option>
                  ),
                )}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="c-titulo">Nome do {kind === "curso" ? "curso" : "oficina"} no certificado</Label>
              <Input id="c-titulo" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="c-nome">Nome completo da pessoa</Label>
              <Input id="c-nome" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="c-email">E-mail da conta</Label>
              <Input
                id="c-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Para aparecer em “Meus certificados”"
              />
            </div>
            <div>
              <Label htmlFor="c-data">{kind === "curso" ? "Finalizado em" : "Realizada em"}</Label>
              <Input id="c-data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-mod">Modalidade</Label>
                <Select id="c-mod" value={modality} onChange={(e) => setModality(e.target.value as WorkshopModality)}>
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="c-carga">Carga horária</Label>
                <Input id="c-carga" value={workload} onChange={(e) => setWorkload(e.target.value)} placeholder="8 horas" />
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gold" className="flex-1">
                Emitir
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <Card>
          <CardTitle className="text-xl">Pedidos de correção de nome</CardTitle>
          <div className="mt-3 grid gap-2">
            {pending.map((p) => {
              const c = certificates.find((x) => x.id === p.certificate_id);
              return (
                <div key={p.id} className="flex flex-col gap-2 rounded-2xl bg-mist/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-navy/80">
                    <strong className="text-navy">{p.requested_by_name}</strong> pediu “{p.requested_name}”
                    {c ? ` · ${c.title} (${c.code})` : ""}
                  </p>
                  <div className="flex gap-2">
                    {c ? (
                      <Button
                        size="sm"
                        variant="gold"
                        onClick={async () => {
                          const r = await reissueCertificate(c.id, p.requested_name);
                          if (!r.ok) return setError(r.error);
                          await resolveCorrection(p.id);
                          setMsg(`Reemitido com o nome “${p.requested_name}” (${r.data?.code}).`);
                        }}
                      >
                        Corrigir e reemitir
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => void resolveCorrection(p.id)}>
                      Dispensar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, curso/oficina ou código"
          className="pl-10"
          aria-label="Buscar certificado"
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhum certificado emitido"
          description="Libere pela lista de inscritos da oficina ou emita manualmente."
        />
      ) : (
        <div className="grid gap-2">
          {list.map((c) => (
            <Card key={c.id} className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">{c.printed_name}</p>
                    <Badge tone={c.kind === "oficina" ? "info" : "gold"}>
                      {c.kind === "oficina" ? "Oficina" : "Curso"}
                    </Badge>
                    {c.status === "revogado" ? <Badge tone="danger">Revogado</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-sm text-navy/70">{c.title}</p>
                  <p className="text-xs text-navy/50">
                    {formatLongDate(c.completed_on)} · {c.code}
                    {c.email ? ` · ${c.email}` : " · sem conta vinculada"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/certificados/${c.id}`}>
                    <Button size="sm" variant="secondary">
                      <Eye className="h-4 w-4" /> Ver
                    </Button>
                  </Link>
                  {c.status === "disponivel" ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const n = prompt("Nome como deve sair no certificado:", c.printed_name);
                          if (!n) return;
                          const r = await reissueCertificate(c.id, n);
                          if (!r.ok) setError(r.error);
                          else setMsg(`Reemitido: ${r.data?.code}.`);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" /> Reemitir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={async () => {
                          if (!confirm("Revogar este certificado? A verificação passa a mostrar “revogado”.")) return;
                          const r = await revokeCertificate(c.id);
                          if (!r.ok) setError(r.error);
                        }}
                      >
                        <ShieldX className="h-4 w-4" /> Revogar
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
