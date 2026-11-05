"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatCompetence, formatCurrency, formatDate } from "@/lib/format";

export default function ChargesPage() {
  const { state } = useAppStore();
  const charges = state.monthlyFees
    .filter((f) => f.status === "VENCIDO" || f.status === "AGUARDANDO")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Cobranças</h1>
        <p className="text-sm text-navy/60">Mensalidades em aberto ou vencidas</p>
      </div>

      <div className="grid gap-3">
        {charges.map((fee) => {
          const member = state.members.find((m) => m.id === fee.member_id);
          return (
            <Card key={fee.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-navy">{member?.full_name}</p>
                  <p className="text-sm text-navy/60">
                    {formatCompetence(fee.competence)} · {formatDate(fee.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(fee.amount)}</p>
                  <Badge tone={feeStatusTone(fee.status)}>{fee.status}</Badge>
                </div>
              </div>
              <Link href={`/cobrancas/${fee.id}`} className="mt-3 block">
                <Button className="w-full">Cobrar</Button>
              </Link>
            </Card>
          );
        })}
        {charges.length === 0 ? (
          <EmptyState title="Nada a cobrar" description="Todas as mensalidades estão em dia." />
        ) : null}
      </div>
    </div>
  );
}
