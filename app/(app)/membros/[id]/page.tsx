"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { memberFinance } from "@/lib/finance";
import {
  currentCompetence,
  formatCompetence,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { CHECKLIST_LEVEL_LABEL } from "@/lib/house-content";
import type { ChecklistLevel } from "@/types";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, generateFee, upsertMember } = useAppStore();
  const member = state.members.find((m) => m.id === params.id);
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [level, setLevel] = useState<ChecklistLevel | "">("");
  const [saved, setSaved] = useState(false);

  if (!member) {
    return <EmptyState title="Membro não encontrado" action={<Link href="/membros"><Button>Voltar</Button></Link>} />;
  }

  const current = member;
  const finance = memberFinance(current, state.monthlyFees);
  const amountValue = amount || String(current.monthly_fee_amount);
  const dueValue = dueDay || String(current.due_day);
  const levelValue = level || current.checklist_level || "";

  function onSaveFee(e: FormEvent) {
    e.preventDefault();
    upsertMember({
      id: current.id,
      full_name: current.full_name,
      phone: current.phone,
      email: current.email,
      monthly_fee_amount: Number(amountValue),
      due_day: Number(dueValue),
      entry_date: current.entry_date,
      status: current.status,
      admin_notes: current.admin_notes,
      profile_id: current.profile_id,
      checklist_level: levelValue
        ? (levelValue as ChecklistLevel)
        : current.checklist_level,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title={current.full_name}
        subtitle={`${current.phone}${current.email ? ` · ${current.email}` : ""}`}
        backHref="/membros"
        backLabel="Membros"
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {current.profile_id ? (
          <p className="text-center text-xs text-leaf">
            Conta de Filho de Santo vinculada — cobranças notificam no app.
          </p>
        ) : null}
        <Button
          variant="gold"
          onClick={() => generateFee(current.id, currentCompetence())}
        >
          Gerar mensalidade do mês
        </Button>
      </div>

      <Card>
        <CardTitle>Valor e nível (Financeiro)</CardTitle>
        <form onSubmit={onSaveFee} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Mensalidade (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amountValue}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Dia do vencimento</Label>
            <Input
              type="number"
              min="1"
              max="28"
              value={dueValue}
              onChange={(e) => setDueDay(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Nível (checklist)</Label>
            <Select
              value={levelValue}
              onChange={(e) => setLevel(e.target.value as ChecklistLevel | "")}
            >
              <option value="">—</option>
              {(Object.keys(CHECKLIST_LEVEL_LABEL) as ChecklistLevel[]).map((k) => (
                <option key={k} value={k}>
                  {CHECKLIST_LEVEL_LABEL[k]}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Salvar valor</Button>
            {saved ? (
              <span className="ml-3 text-sm text-success">Salvo.</span>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-navy/55">Mensalidade</p>
          <p className="mt-1 font-display text-2xl text-navy">{formatCurrency(member.monthly_fee_amount)}</p>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Situação</p>
          <div className="mt-2"><Badge tone={feeStatusTone(finance.situation)}>{finance.situation}</Badge></div>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Meses pendentes</p>
          <p className="mt-1 font-display text-2xl text-navy">{finance.overdueMonths}</p>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Total pendente</p>
          <p className="mt-1 font-display text-2xl text-danger">{formatCurrency(finance.pendingTotal)}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Dados</CardTitle>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-navy/55">Entrada</dt><dd>{formatDate(member.entry_date)}</dd></div>
          <div><dt className="text-navy/55">Vencimento</dt><dd>Dia {member.due_day}</dd></div>
          <div><dt className="text-navy/55">Cadastro</dt><dd className="capitalize">{member.status}</dd></div>
          <div><dt className="text-navy/55">Mês atual</dt><dd>{finance.current ? formatCompetence(finance.current.competence) : "—"}</dd></div>
          {member.admin_notes ? (
            <div className="sm:col-span-2"><dt className="text-navy/55">Observações</dt><dd>{member.admin_notes}</dd></div>
          ) : null}
        </dl>
      </Card>

      <Card>
        <CardTitle>Histórico financeiro</CardTitle>
        <ul className="mt-3 space-y-3">
          {finance.memberFees
            .slice()
            .sort((a, b) => b.competence.localeCompare(a.competence))
            .map((fee) => (
              <li key={fee.id} className="flex items-center justify-between gap-3 rounded-2xl bg-mist/60 p-3">
                <div>
                  <p className="font-medium text-navy">{formatCompetence(fee.competence)}</p>
                  <p className="text-xs text-navy/55">Venc. {formatDate(fee.due_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(fee.amount)}</p>
                  <Badge tone={feeStatusTone(fee.status)}>{fee.status}</Badge>
                </div>
              </li>
            ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Últimos pagamentos</CardTitle>
        <ul className="mt-3 space-y-2">
          {finance.lastPayments.map((fee) => (
            <li key={fee.id} className="flex justify-between text-sm">
              <span>{formatCompetence(fee.competence)}</span>
              <span>{formatCurrency(fee.amount_received ?? fee.amount)} · {formatDateTime(fee.paid_at)}</span>
            </li>
          ))}
          {finance.lastPayments.length === 0 ? (
            <p className="text-sm text-navy/55">Nenhum pagamento registrado.</p>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
