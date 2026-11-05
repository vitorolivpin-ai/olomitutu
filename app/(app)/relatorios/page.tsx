"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { currentCompetence, formatCurrency, formatDuration } from "@/lib/format";
import { canAccess } from "@/lib/permissions";

export default function ReportsPage() {
  const { state, currentUser } = useAppStore();
  const [month, setMonth] = useState(currentCompetence());

  const report = useMemo(() => {
    const appointments = state.appointments.filter((a) =>
      a.scheduled_at.startsWith(month),
    );
    const done = appointments.filter((a) => a.status === "REALIZADO");
    const cancelled = appointments.filter((a) => a.status === "CANCELADO").length;
    const noShow = appointments.filter((a) => a.status === "NAO_COMPARECEU").length;
    const received = done.reduce((sum, a) => sum + (a.amount ?? 0), 0);
    const durations = done
      .filter((a) => a.started_at && a.ended_at)
      .map((a) => new Date(a.ended_at!).getTime() - new Date(a.started_at!).getTime());
    const totalMs = durations.reduce((sum, d) => sum + d, 0);
    const avgMs = durations.length ? totalMs / durations.length : 0;
    return {
      games: done.length,
      hoursLabel: formatDuration(totalMs),
      received,
      avgLabel: durations.length ? formatDuration(avgMs) : "—",
      cancelled,
      noShow,
    };
  }, [state.appointments, month]);

  if (!canAccess(currentUser?.role, "reports")) {
    return <EmptyState title="Relatórios indisponíveis para este perfil" />;
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Relatórios de atendimento</h1>
        <p className="text-sm text-navy/60">Filtro por mês</p>
      </div>

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
