import type { AppState, Member, MonthlyFee } from "@/types";
import { currentCompetence, formatCurrency } from "./format";

export function feesForCompetence(state: AppState, competence = currentCompetence()) {
  return state.monthlyFees.filter((f) => f.competence === competence);
}

export function expensesForCompetence(state: AppState, competence = currentCompetence()) {
  return state.expenses.filter((e) => e.competence === competence);
}

export function dashboardMetrics(state: AppState, competence = currentCompetence()) {
  const fees = feesForCompetence(state, competence);
  const expenses = expensesForCompetence(state, competence);

  const expected = fees
    .filter((f) => f.status !== "CANCELADO" && f.status !== "ISENTO")
    .reduce((sum, f) => sum + f.amount, 0);

  const received = fees
    .filter((f) => f.status === "PAGO")
    .reduce((sum, f) => sum + (f.amount_received ?? f.amount), 0);

  const overdueFees = state.monthlyFees.filter((f) => f.status === "VENCIDO");
  const overdueAmount = overdueFees.reduce((sum, f) => sum + f.amount, 0);
  const overdueMemberIds = new Set(overdueFees.map((f) => f.member_id));

  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = received - expenseTotal;
  const coverage = expenseTotal === 0 ? 100 : Math.round((received / expenseTotal) * 100);

  const coverageMessage =
    received >= expenseTotal
      ? "As mensalidades recebidas cobrem as contas deste mês."
      : `Ainda faltam ${formatCurrency(expenseTotal - received)} para cobrir as despesas deste mês.`;

  return {
    expected,
    received,
    overdueAmount,
    overdueMembers: overdueMemberIds.size,
    expenseTotal,
    balance,
    coverage,
    coverageMessage,
  };
}

export function memberFinance(member: Member, fees: MonthlyFee[]) {
  const memberFees = fees.filter((f) => f.member_id === member.id);
  const pending = memberFees.filter((f) => f.status === "VENCIDO" || f.status === "AGUARDANDO");
  const overdue = memberFees.filter((f) => f.status === "VENCIDO");
  const pendingTotal = pending.reduce((sum, f) => sum + f.amount, 0);
  const current = memberFees.find((f) => f.competence === currentCompetence());

  let situation: "PAGO" | "AGUARDANDO" | "VENCIDO" | "ISENTO" = "AGUARDANDO";
  if (member.status === "isento") situation = "ISENTO";
  else if (overdue.length > 0) situation = "VENCIDO";
  else if (current?.status === "PAGO") situation = "PAGO";
  else if (current?.status === "AGUARDANDO") situation = "AGUARDANDO";

  return {
    memberFees,
    overdueMonths: overdue.length,
    pendingTotal,
    situation,
    current,
    lastPayments: memberFees
      .filter((f) => f.status === "PAGO")
      .sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""))
      .slice(0, 5),
  };
}

export function monthHistory(state: AppState) {
  const competences = Array.from(
    new Set([
      ...state.monthlyFees.map((f) => f.competence),
      ...state.expenses.map((e) => e.competence),
    ]),
  ).sort();

  return competences.map((competence) => {
    const received = feesForCompetence(state, competence)
      .filter((f) => f.status === "PAGO")
      .reduce((sum, f) => sum + (f.amount_received ?? f.amount), 0);
    const expenses = expensesForCompetence(state, competence).reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    return {
      competence,
      received,
      expenses,
      balance: received - expenses,
      coverage: expenses === 0 ? 100 : Math.round((received / expenses) * 100),
    };
  });
}
