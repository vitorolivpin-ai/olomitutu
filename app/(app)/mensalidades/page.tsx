"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { currentCompetence, formatCompetence, formatCurrency, formatDate } from "@/lib/format";

export default function FeesPage() {
  const { state, generateFee } = useAppStore();
  const [memberId, setMemberId] = useState(state.members[0]?.id ?? "");
  const [competence, setCompetence] = useState(currentCompetence());
  const [filter, setFilter] = useState("TODAS");
  const [monthFilter, setMonthFilter] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  function onGenerate(e: FormEvent) {
    e.preventDefault();
    if (!memberId) return;
    generateFee(memberId, competence);
  }

  const fees = state.monthlyFees
    .filter((fee) => (filter === "TODAS" ? true : fee.status === filter))
    .filter((fee) => !monthFilter || fee.competence === monthFilter)
    .filter((fee) => {
      const member = state.members.find((item) => item.id === fee.member_id);
      return member?.full_name.toLowerCase().includes(memberSearch.trim().toLowerCase()) ?? false;
    })
    .slice()
    .sort((a, b) => b.competence.localeCompare(a.competence));

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader title="Mensalidades" subtitle="Histórico por competência" />

      <Card>
        <CardTitle>Gerar mensalidade</CardTitle>
        <form onSubmit={onGenerate} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Membro</Label>
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Competência</Label>
            <Input type="month" value={competence} onChange={(e) => setCompetence(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Gerar</Button>
          </div>
        </form>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["TODAS", "PAGO", "AGUARDANDO", "VENCIDO", "ISENTO", "CANCELADO"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "primary" : "secondary"}
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="sr-only" htmlFor="fee-month-filter">Filtrar por mês</Label>
        <Input
          id="fee-month-filter"
          type="month"
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
          aria-label="Filtrar mensalidades por mês"
        />
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-navy/15 bg-white px-4 text-navy/55">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Buscar membro"
            className="min-w-0 flex-1 bg-transparent text-base text-navy outline-none"
            aria-label="Buscar membro"
          />
        </label>
      </div>

      <div className="grid gap-3">
        {fees.map((fee) => {
          const member = state.members.find((m) => m.id === fee.member_id);
          return (
            <Card key={fee.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-navy">{member?.full_name}</p>
                  <p className="text-sm text-navy/60">
                    {formatCompetence(fee.competence)} · vence {formatDate(fee.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-navy">{formatCurrency(fee.amount)}</p>
                  <Badge tone={feeStatusTone(fee.status)}>{fee.status}</Badge>
                </div>
              </div>
              {(fee.status === "VENCIDO" || fee.status === "AGUARDANDO") && (
                <div className="mt-3">
                  <Link href={`/mensalidades/${fee.id}`}>
                    <Button className="w-full sm:w-auto">Cobrar</Button>
                  </Link>
                </div>
              )}
              <Link href={`/mensalidades/${fee.id}`} className="mt-2 block text-sm text-gold-deep">
                Ver histórico e comprovante
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
