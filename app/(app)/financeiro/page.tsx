"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";
import { dashboardMetrics, monthHistory } from "@/lib/finance";
import {
  currentCompetence,
  formatCompetence,
  formatCurrency,
  signedCurrency,
} from "@/lib/format";
import { canAccess } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";

export default function FinancePage() {
  const { state, currentUser } = useAppStore();

  if (!canAccess(currentUser?.role, "finance") && !canAccess(currentUser?.role, "fees")) {
    return <EmptyState title="Acesso restrito" description="Seu perfil não visualiza o financeiro." />;
  }

  const competence = currentCompetence();
  const metrics = dashboardMetrics(state, competence);
  const history = monthHistory(state).map((h) => ({
    ...h,
    label: formatCompetence(h.competence).replace(/ de /g, "/").slice(0, 10),
  }));

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Análise financeira"
        subtitle={formatCompetence(competence)}
      />
      <div className="flex flex-wrap justify-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/conversas">
            <Button variant="secondary">Chat com clientes</Button>
          </Link>
          <Link href="/loja/liberacoes">
            <Button variant="gold">Liberações da loja</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-navy/55">Recebido</p>
          <p className="mt-1 font-display text-2xl text-leaf">{formatCurrency(metrics.received)}</p>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Despesas</p>
          <p className="mt-1 font-display text-2xl text-navy">{formatCurrency(metrics.expenseTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Saldo</p>
          <p className="mt-1 font-display text-2xl text-navy">{signedCurrency(metrics.balance)}</p>
        </Card>
        <Card>
          <p className="text-xs text-navy/55">Cobertura</p>
          <p className="mt-1 font-display text-2xl text-gold-deep">{metrics.coverage}%</p>
        </Card>
      </div>

      <Card className="border-l-4 border-l-leaf">
        <p className="font-medium text-navy">{metrics.coverageMessage}</p>
      </Card>

      <Card>
        <CardTitle>Evolução mensal</CardTitle>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e0ea" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Legend />
              <Bar dataKey="received" name="Recebido" fill="#1F6B4A" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" name="Despesas" fill="#0B1F3A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-3">
        {history
          .slice()
          .reverse()
          .map((h) => (
            <Card key={h.competence}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-lg text-navy">{formatCompetence(h.competence)}</p>
                <p className="text-sm text-navy/70">Cobertura {h.coverage}%</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <p>Recebido<br /><strong>{formatCurrency(h.received)}</strong></p>
                <p>Despesas<br /><strong>{formatCurrency(h.expenses)}</strong></p>
                <p>Saldo<br /><strong>{signedCurrency(h.balance)}</strong></p>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
