"use client";

import Link from "next/link";
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

  function onGenerate(e: FormEvent) {
    e.preventDefault();
    if (!memberId) return;
    generateFee(memberId, competence);
  }

  const fees = state.monthlyFees
    .filter((f) => (filter === "TODAS" ? true : f.status === filter))
    .slice()
    .sort((a, b) => b.competence.localeCompare(a.competence));

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Mensalidades</h1>
        <p className="text-sm text-navy/60">Histórico por competência</p>
      </div>

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
                  <Link href={`/cobrancas/${fee.id}`}>
                    <Button className="w-full sm:w-auto">Cobrar</Button>
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
