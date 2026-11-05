"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { useAppStore } from "@/hooks/use-app-store";
import { dashboardMetrics } from "@/lib/finance";
import {
  currentCompetence,
  formatCompetence,
  formatCurrency,
  formatDateTime,
  signedCurrency,
} from "@/lib/format";
import { canAccess } from "@/lib/permissions";

export default function DashboardPage() {
  const { state, currentUser } = useAppStore();
  const competence = currentCompetence();
  const metrics = dashboardMetrics(state, competence);
  const showFinance = canAccess(currentUser?.role, "finance") || canAccess(currentUser?.role, "fees");

  const overdueFees = state.monthlyFees
    .filter((f) => f.status === "VENCIDO")
    .map((f) => ({
      ...f,
      member: state.members.find((m) => m.id === f.member_id),
    }));

  const nextExpenses = state.expenses
    .filter((e) => e.status !== "PAGA" && e.competence === competence)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 4);

  const nextAppointments = state.appointments
    .filter((a) => ["SOLICITADO", "CONFIRMADO"].includes(a.status))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 4);

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Resumo</h1>
        <p className="text-sm text-navy/60">{formatCompetence(competence)} · dados demonstrativos</p>
      </div>

      {showFinance ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi title="Previstas" value={formatCurrency(metrics.expected)} />
            <Kpi title="Recebidas" value={formatCurrency(metrics.received)} accent />
            <Kpi title="Em atraso" value={formatCurrency(metrics.overdueAmount)} danger />
            <Kpi title="Membros em atraso" value={String(metrics.overdueMembers)} />
            <Kpi title="Despesas do mês" value={formatCurrency(metrics.expenseTotal)} />
            <Kpi title="Saldo do mês" value={signedCurrency(metrics.balance)} />
            <Kpi title="Cobertura" value={`${metrics.coverage}%`} className="sm:col-span-2" />
          </div>

          <Card className="border-l-4 border-l-gold">
            <p className="text-base font-medium text-navy">{metrics.coverageMessage}</p>
            <p className="mt-1 text-sm text-navy/60">
              Recebido {formatCurrency(metrics.received)} · Contas {formatCurrency(metrics.expenseTotal)}
            </p>
          </Card>
        </>
      ) : (
        <Card>
          <CardTitle>Olá, {currentUser?.full_name}</CardTitle>
          <p className="mt-2 text-sm text-navy/65">
            Acompanhe seus agendamentos e conversas. Dados financeiros do barracão não são
            exibidos para este perfil.
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {showFinance ? (
          <>
            <Card>
              <CardTitle>Próximas contas</CardTitle>
              <ul className="mt-3 space-y-3">
                {nextExpenses.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-navy">{e.description}</p>
                      <p className="text-xs text-navy/55">Vence {e.due_date.split("-").reverse().join("/")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-navy">{formatCurrency(e.amount)}</p>
                      <Badge tone={feeStatusTone(e.status)}>{e.status.replace("_", " ")}</Badge>
                    </div>
                  </li>
                ))}
                {nextExpenses.length === 0 ? (
                  <p className="text-sm text-navy/55">Nenhuma conta aberta.</p>
                ) : null}
              </ul>
            </Card>

            <Card>
              <CardTitle>Mensalidades vencidas</CardTitle>
              <ul className="mt-3 space-y-3">
                {overdueFees.slice(0, 5).map((f) => (
                  <li key={f.id}>
                    <Link href={`/cobrancas/${f.id}`} className="block rounded-2xl hover:bg-mist/70 p-2 -mx-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-navy">{f.member?.full_name}</p>
                          <p className="text-xs text-navy/55">{formatCompetence(f.competence)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-navy">{formatCurrency(f.amount)}</p>
                          <Badge tone="danger">VENCIDO</Badge>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
                {overdueFees.length === 0 ? (
                  <p className="text-sm text-navy/55">Nenhuma mensalidade vencida.</p>
                ) : null}
              </ul>
            </Card>
          </>
        ) : null}

        <Card className={showFinance ? "" : "lg:col-span-3"}>
          <CardTitle>Próximos atendimentos</CardTitle>
          <ul className="mt-3 space-y-3">
            {nextAppointments
              .filter((a) =>
                currentUser?.role === "cliente"
                  ? a.client_id === currentUser.client_id
                  : true,
              )
              .map((a) => {
                const client = state.clients.find((c) => c.id === a.client_id);
                return (
                  <li key={a.id}>
                    <Link href={`/atendimentos/${a.id}`} className="block rounded-2xl p-2 -mx-2 hover:bg-mist/70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-navy">{client?.full_name}</p>
                          <p className="text-xs text-navy/55">{formatDateTime(a.scheduled_at)}</p>
                        </div>
                        <Badge tone={feeStatusTone(a.status)}>{a.status.replaceAll("_", " ")}</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            {nextAppointments.length === 0 ? (
              <p className="text-sm text-navy/55">Nenhum atendimento próximo.</p>
            ) : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  accent,
  danger,
  className,
}: {
  title: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <p className="text-xs uppercase tracking-wide text-navy/55">{title}</p>
      <p
        className={`mt-2 font-display text-2xl ${
          danger ? "text-danger" : accent ? "text-leaf" : "text-navy"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
