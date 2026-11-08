"use client";

import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Award, Check, Download, MessageCircle, Search, UserPlus, X } from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage, LoadingBlock } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { useWorkshops } from "@/hooks/use-workshops";
import { cn } from "@/lib/utils";
import {
  formatLongDate,
  formatPhone,
  REGISTRATION_STATUS_LABEL,
  registrationsToCsv,
  whatsappLink,
} from "@/lib/workshops";
import type { WorkshopHouseLink, WorkshopRegistrationStatus } from "@/types";

const tone: Record<WorkshopRegistrationStatus, "success" | "warning" | "muted" | "gold"> = {
  confirmada: "success",
  lista_espera: "warning",
  cancelada: "muted",
  presente: "gold",
};

type Filter = "todos" | WorkshopRegistrationStatus;

export default function InscritosPage() {
  const params = useParams<{ id: string }>();
  const {
    ready,
    canManage,
    workshops,
    registrations,
    certificates,
    spotsFor,
    setRegistrationStatus,
    addManualRegistration,
    issueWorkshopCertificates,
    issueForRegistration,
  } = useWorkshops();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [nName, setNName] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nLink, setNLink] = useState<WorkshopHouseLink>("nao");

  const w = workshops.find((x) => x.id === params.id);
  const regs = useMemo(
    () =>
      registrations
        .filter((r) => r.workshop_id === params.id)
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR")),
    [registrations, params.id],
  );

  const hasCert = (email: string) =>
    certificates.some(
      (c) =>
        c.kind === "oficina" &&
        c.reference_id === params.id &&
        c.status === "disponivel" &&
        (c.email ?? "").toLowerCase() === email.toLowerCase(),
    );

  if (!canManage) return <EmptyState title="Acesso restrito ao Pai de Santo e Administrador" />;
  if (!ready) return <LoadingBlock />;
  if (!w) return <EmptyState title="Oficina não encontrada" />;

  const spots = spotsFor(w);
  const shown = regs.filter((r) => {
    if (filter !== "todos" && r.status !== filter) return false;
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      r.full_name.toLowerCase().includes(t) ||
      r.email.toLowerCase().includes(t) ||
      r.phone.replace(/\D/g, "").includes(t.replace(/\D/g, "") || "§")
    );
  });
  const presentes = regs.filter((r) => r.status === "presente");
  const pendentesCert = presentes.filter((r) => !hasCert(r.email)).length;

  function exportCsv() {
    if (!w) return;
    const blob = new Blob([registrationsToCsv(w, regs)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inscritos-${w.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!w) return;
    setError("");
    const r = await addManualRegistration(w.id, {
      workshop_id: w.id,
      full_name: nName,
      phone: nPhone,
      email: nEmail,
      house_link: nLink,
      attended_before: false,
      accepted_terms: true,
    });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setMsg(
      r.data?.status === "lista_espera"
        ? `${r.data.full_name} entrou na lista de espera (vagas cheias).`
        : `${r.data?.full_name} inscrito(a).`,
    );
    setNName("");
    setNPhone("");
    setNEmail("");
    setAdding(false);
  }

  const greet = (name: string) =>
    `Olá, ${name.split(" ")[0]}! Aqui é do Ilé Olóròkè Àṣẹ Olómi Tútù, sobre a oficina ${w.title}${
      w.date ? ` (${formatLongDate(w.date)})` : ""
    }.`;

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Inscritos"
        subtitle={`${w.title}${w.date ? ` · ${formatLongDate(w.date)}` : ""}`}
        backHref="/gestao-oficinas"
        backLabel="Oficinas"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Confirmados", `${spots.confirmed}${spots.total ? `/${spots.total}` : ""}`],
          ["Vagas restantes", spots.left === null ? "Sem limite" : String(spots.left)],
          ["Lista de espera", String(spots.waitlist)],
          ["Presentes", String(presentes.length)],
        ].map(([k, v]) => (
          <Card key={k} className="p-3 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy/50">{k}</p>
            <p className="mt-1 font-display text-2xl text-navy">{v}</p>
          </Card>
        ))}
      </div>

      {msg ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">{msg}</p>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}

      {w.issues_certificate ? (
        <Card id="certificados" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="h-5 w-5 text-gold-deep" /> Certificados
            </CardTitle>
            <p className="mt-1 text-sm text-navy/65">
              Marque “Presente” em quem participou e libere. O certificado aparece na conta da pessoa
              (pelo e-mail da inscrição) já com a assinatura do Pai de Santo.
            </p>
          </div>
          <Button
            variant="gold"
            disabled={pendentesCert === 0}
            onClick={async () => {
              setError("");
              const r = await issueWorkshopCertificates(w.id);
              if (!r.ok) setError(r.error);
              else setMsg(`${r.data?.issued ?? 0} certificado(s) liberado(s).`);
            }}
          >
            Liberar certificados{pendentesCert ? ` (${pendentesCert})` : ""}
          </Button>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nome, e-mail ou telefone"
            className="pl-10"
            aria-label="Buscar inscrito"
          />
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="sm:w-52"
          aria-label="Filtrar por status"
        >
          <option value="todos">Todos ({regs.length})</option>
          <option value="confirmada">Confirmados</option>
          <option value="presente">Presentes</option>
          <option value="lista_espera">Lista de espera</option>
          <option value="cancelada">Cancelados</option>
        </Select>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={exportCsv} className="flex-1">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="primary" size="md" onClick={() => setAdding((v) => !v)} className="flex-1">
            <UserPlus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      {adding ? (
        <Card>
          <CardTitle className="text-xl">Inscrever manualmente</CardTitle>
          <p className="mt-1 text-sm text-navy/60">Para quem se inscreveu pessoalmente ou pelo WhatsApp.</p>
          <form onSubmit={onAdd} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="m-nome">Nome completo</Label>
              <Input id="m-nome" value={nName} onChange={(e) => setNName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="m-tel">WhatsApp</Label>
              <Input
                id="m-tel"
                value={nPhone}
                onChange={(e) => setNPhone(formatPhone(e.target.value))}
                inputMode="tel"
                required
              />
            </div>
            <div>
              <Label htmlFor="m-email">E-mail</Label>
              <Input id="m-email" type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="m-vinc">Filho(a) da casa?</Label>
              <Select id="m-vinc" value={nLink} onChange={(e) => setNLink(e.target.value as WorkshopHouseLink)}>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
                <option value="frequentador">Frequentador(a)</option>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gold" className="flex-1">
                Inscrever
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState title="Nenhum inscrito" description="As inscrições aparecem aqui em tempo real." />
      ) : (
        <div className="grid gap-2">
          {shown.map((r) => {
            const certOk = hasCert(r.email);
            return (
              <Card key={r.id} className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-navy">{r.full_name}</p>
                      <Badge tone={tone[r.status]}>{REGISTRATION_STATUS_LABEL[r.status]}</Badge>
                      {certOk ? <Badge tone="info">Certificado liberado</Badge> : null}
                      {r.added_by_staff ? <span className="text-xs text-navy/45">inscrito pela casa</span> : null}
                    </div>
                    <p className="mt-0.5 break-all text-sm text-navy/60">
                      {r.phone} · {r.email}
                    </p>
                    {r.accessibility_needs || r.notes ? (
                      <p className="mt-1 text-xs text-navy/55">
                        {r.accessibility_needs ? `Acessibilidade: ${r.accessibility_needs}. ` : ""}
                        {r.notes ? `Obs.: ${r.notes}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "confirmada" || r.status === "presente" ? (
                      <Button
                        size="sm"
                        variant={r.status === "presente" ? "gold" : "secondary"}
                        aria-pressed={r.status === "presente"}
                        onClick={() =>
                          void setRegistrationStatus(r.id, r.status === "presente" ? "confirmada" : "presente")
                        }
                      >
                        <Check className="h-4 w-4" /> {r.status === "presente" ? "Presente" : "Marcar presença"}
                      </Button>
                    ) : null}
                    {r.status === "lista_espera" ? (
                      <Button size="sm" variant="secondary" onClick={() => void setRegistrationStatus(r.id, "confirmada")}>
                        Confirmar vaga
                      </Button>
                    ) : null}
                    {r.status === "presente" && !certOk && w.issues_certificate ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const res = await issueForRegistration(r.id);
                          if (!res.ok) setError(res.error);
                          else setMsg(`Certificado de ${r.full_name} liberado.`);
                        }}
                      >
                        <Award className="h-4 w-4" /> Liberar
                      </Button>
                    ) : null}
                    <a href={whatsappLink(r.phone, greet(r.full_name))} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </Button>
                    </a>
                    {r.status !== "cancelada" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("text-danger")}
                        onClick={() => {
                          if (confirm(`Cancelar a inscrição de ${r.full_name}?`))
                            void setRegistrationStatus(r.id, "cancelada");
                        }}
                      >
                        <X className="h-4 w-4" /> Cancelar
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => void setRegistrationStatus(r.id, "confirmada")}>
                        Reativar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
