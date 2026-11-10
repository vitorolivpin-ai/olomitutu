"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { currentCompetence, formatCompetence, formatCurrency, formatDuration } from "@/lib/format";
import { monthHistory } from "@/lib/finance";
import { canAccess } from "@/lib/permissions";

export default function ReportsPage() {
  const { state, currentUser } = useAppStore();
  if (currentUser?.role === "tesouraria") return <FinancialReports state={state} />;
  if (currentUser?.role !== "pai_de_santo" || !canAccess(currentUser.role, "reports")) {
    return <EmptyState title="Relatórios indisponíveis para este perfil" />;
  }

  return <PaiAttendanceReports appointments={state.appointments} />;
}

function FinancialReports({ state }: { state: ReturnType<typeof useAppStore>["state"] }) {
  const [month, setMonth] = useState(currentCompetence());
  const report = useMemo(
    () => monthHistory(state).find((item) => item.competence === month) ?? {
      competence: month,
      received: 0,
      expenses: 0,
      balance: 0,
      coverage: 100,
    },
    [state, month],
  );

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader title="Relatórios Financeiros" subtitle={formatCompetence(month)} />
      <Card>
        <Label htmlFor="finance-month">Mês</Label>
        <Input
          id="finance-month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Mensalidades recebidas" value={formatCurrency(report.received)} />
        <Stat title="Despesas" value={formatCurrency(report.expenses)} />
        <Stat title="Saldo" value={formatCurrency(report.balance)} />
        <Stat title="Cobertura" value={`${report.coverage}%`} />
      </div>
    </div>
  );
}

function PaiAttendanceReports({
  appointments,
}: {
  appointments: ReturnType<typeof useAppStore>["state"]["appointments"];
}) {
  const [month, setMonth] = useState(currentCompetence());
  const report = useMemo(() => {
    const inMonth = appointments.filter((appointment) => appointment.scheduled_at.startsWith(month));
    const done = inMonth.filter((appointment) => appointment.status === "REALIZADO");
    const durations = done
      .filter((appointment) => appointment.started_at && appointment.ended_at)
      .map((appointment) => new Date(appointment.ended_at!).getTime() - new Date(appointment.started_at!).getTime());
    const totalMs = durations.reduce((sum, duration) => sum + duration, 0);
    return {
      games: done.length,
      hoursLabel: formatDuration(totalMs),
      received: done.reduce((sum, appointment) => sum + (appointment.amount ?? 0), 0),
      avgLabel: durations.length ? formatDuration(totalMs / durations.length) : "—",
      cancelled: inMonth.filter((appointment) => appointment.status === "CANCELADO").length,
      noShow: inMonth.filter((appointment) => appointment.status === "NAO_COMPARECEU").length,
    };
  }, [appointments, month]);

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader title="Relatórios de atendimento" subtitle="Filtro por mês" />

      <Card>
        <Label htmlFor="month">Mês</Label>
        <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat title="Jogos realizados" value={String(report.games)} />
        <Stat title="Horas trabalhadas" value={report.hoursLabel} />
        <Stat title="Valor recebido" value={formatCurrency(report.received)} />
        <Stat title="Média de duração" value={report.avgLabel} />
        <Stat title="Cancelamentos" value={String(report.cancelled)} />
        <Stat title="Não comparecimentos" value={String(report.noShow)} />
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-navy/55">{title}</p>
      <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
    </Card>
  );
}
