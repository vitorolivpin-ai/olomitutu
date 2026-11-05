"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { memberFinance } from "@/lib/finance";
import {
  currentCompetence,
  formatCompetence,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, generateFee } = useAppStore();
  const member = state.members.find((m) => m.id === params.id);

  if (!member) {
    return <EmptyState title="Membro não encontrado" action={<Link href="/membros"><Button>Voltar</Button></Link>} />;
  }

  const finance = memberFinance(member, state.monthlyFees);

  return (
    <div className="animate-rise space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/membros" className="text-sm text-navy/55 hover:text-navy">
            ← Membros
          </Link>
          <h1 className="font-display text-3xl text-navy">{member.full_name}</h1>
          <p className="text-sm text-navy/60">{member.phone}{member.email ? ` · ${member.email}` : ""}</p>
        </div>
        <Button
          variant="gold"
          onClick={() => generateFee(member.id, currentCompetence())}
        >
          Gerar mensalidade do mês
        </Button>
      </div>

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
