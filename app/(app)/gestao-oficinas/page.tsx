"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Award, Copy, ExternalLink, Pencil, Plus, Trash2, Users } from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorMessage, LoadingBlock } from "@/components/ui/empty-state";
import { WorkshopImage } from "@/components/workshops/workshop-card";
import { useWorkshops } from "@/hooks/use-workshops";
import { cn } from "@/lib/utils";
import {
  formatLongDate,
  formatTimeRange,
  MODALITY_LABEL,
  todayYmd,
  WORKSHOP_STATUS_LABEL,
} from "@/lib/workshops";
import type { WorkshopStatus } from "@/types";

type Tab = "proximas" | "rascunhos" | "encerradas";

const statusTone: Record<WorkshopStatus, "success" | "warning" | "info" | "muted" | "danger"> = {
  publicada: "success",
  em_breve: "info",
  rascunho: "warning",
  encerrada: "muted",
  cancelada: "danger",
};

export default function GestaoOficinasPage() {
  const {
    ready,
    canManage,
    workshops,
    registrations,
    spotsFor,
    removeWorkshop,
    duplicateWorkshop,
    missingMigration,
  } = useWorkshops();
  const [tab, setTab] = useState<Tab>("proximas");
  const [error, setError] = useState("");

  const lists = useMemo(() => {
    const today = todayYmd();
    const past = (d?: string) => !!d && d < today;
    return {
      proximas: workshops.filter(
        (w) => (w.status === "publicada" || w.status === "em_breve") && !past(w.date),
      ),
      rascunhos: workshops.filter((w) => w.status === "rascunho"),
      encerradas: workshops.filter(
        (w) => w.status === "encerrada" || w.status === "cancelada" || (w.status === "publicada" && past(w.date)),
      ),
    };
  }, [workshops]);

  if (!canManage) return <EmptyState title="Acesso restrito ao Pai de Santo e Administrador" />;

  const list = lists[tab]
    .slice()
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") * (tab === "encerradas" ? -1 : 1));

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Oficinas"
        subtitle="Crie e gerencie as oficinas, vagas, inscritos e certificados. Separado da Loja."
      />

      {missingMigration ? (
        <ErrorMessage message="As tabelas de oficinas ainda não existem no Supabase. Rode supabase/migrations/029_workshops_certificates.sql no SQL Editor." />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto" role="tablist">
          {(
            [
              ["proximas", `Próximas (${lists.proximas.length})`],
              ["rascunhos", `Rascunhos (${lists.rascunhos.length})`],
              ["encerradas", `Encerradas (${lists.encerradas.length})`],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold",
                tab === id ? "border-navy bg-navy text-white" : "border-navy/15 bg-white text-navy/75",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href="/gestao-oficinas/nova">
          <Button variant="gold" size="md">
            <Plus className="h-4 w-4" /> Nova oficina
          </Button>
        </Link>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      {!ready ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyState
          title={tab === "rascunhos" ? "Nenhum rascunho" : "Nenhuma oficina aqui"}
          description="Toque em “Nova oficina” para cadastrar."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((w) => {
            const spots = spotsFor(w);
            const presentes = registrations.filter(
              (r) => r.workshop_id === w.id && r.status === "presente",
            ).length;
            const pct = spots.total ? Math.min(100, (spots.confirmed / spots.total) * 100) : 0;
            return (
              <Card key={w.id} className="flex flex-col">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                    <WorkshopImage workshop={w} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone[w.status]}>{WORKSHOP_STATUS_LABEL[w.status]}</Badge>
                      <span className="text-xs text-navy/55">{MODALITY_LABEL[w.modality]}</span>
                    </div>
                    <h3 className="mt-1 font-display text-lg leading-snug text-navy">{w.title}</h3>
                    <p className="text-xs text-navy/60">
                      {w.date ? formatLongDate(w.date) : "Data a definir"}
                      {formatTimeRange(w) ? ` · ${formatTimeRange(w)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-navy/65">
                    <span>
                      {spots.confirmed}
                      {spots.total ? `/${spots.total}` : ""} inscritos
                      {spots.waitlist ? ` · ${spots.waitlist} na espera` : ""}
                    </span>
                    {presentes ? <span>{presentes} presentes</span> : null}
                  </div>
                  {spots.total ? (
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy/10">
                      <div
                        className={pct >= 100 ? "h-full bg-danger" : "h-full bg-gold"}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-navy/10 pt-3">
                  <Link href={`/gestao-oficinas/${w.id}/inscritos`}>
                    <Button size="sm" variant="primary">
                      <Users className="h-4 w-4" /> Inscritos
                    </Button>
                  </Link>
                  <Link href={`/gestao-oficinas/${w.id}`}>
                    <Button size="sm" variant="secondary">
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                  </Link>
                  {w.status !== "rascunho" ? (
                    <Link href={`/oficinas/${w.id}`} target="_blank">
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" /> Ver
                      </Button>
                    </Link>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const r = await duplicateWorkshop(w.id);
                      if (!r.ok) setError(r.error);
                      else setTab("rascunhos");
                    }}
                  >
                    <Copy className="h-4 w-4" /> Duplicar
                  </Button>
                  {w.issues_certificate ? (
                    <Link href={`/gestao-oficinas/${w.id}/inscritos#certificados`}>
                      <Button size="sm" variant="ghost">
                        <Award className="h-4 w-4" /> Certificados
                      </Button>
                    </Link>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={async () => {
                      if (!confirm(`Excluir “${w.title}” e todas as inscrições?`)) return;
                      const r = await removeWorkshop(w.id);
                      if (!r.ok) setError(r.error);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
