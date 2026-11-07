"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { currentCompetence, formatCompetence, formatCurrency, formatDate } from "@/lib/format";
import type { ExpenseCategory, ExpenseStatus } from "@/types";

const categories: ExpenseCategory[] = [
  "luz",
  "agua",
  "internet",
  "aluguel",
  "manutencao",
  "materiais",
  "outras",
];

export default function ExpensesPage() {
  const { state, upsertExpense } = useAppStore();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("luz");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [competence, setCompetence] = useState(currentCompetence());
  const [status, setStatus] = useState<ExpenseStatus>("EM_ABERTO");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    upsertExpense({
      category,
      description,
      amount: Number(amount),
      due_date: dueDate,
      competence,
      status,
      paid_at: status === "PAGA" ? new Date().toISOString() : undefined,
    });
    setOpen(false);
    setDescription("");
    setAmount("");
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader title="Despesas" subtitle="Contas do barracão" />
      <div className="flex justify-center gap-3">
        <Button size="md" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      {open ? (
        <Card>
          <CardTitle>Nova despesa</CardTitle>
          <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus)}>
                <option value="EM_ABERTO">EM ABERTO</option>
                <option value="PAGA">PAGA</option>
                <option value="VENCIDA">VENCIDA</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div>
              <Label>Competência</Label>
              <Input type="month" value={competence} onChange={(e) => setCompetence(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {state.expenses
          .slice()
          .sort((a, b) => b.competence.localeCompare(a.competence))
          .map((expense) => (
            <Card key={expense.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl capitalize text-navy">{expense.description}</p>
                  <p className="text-sm text-navy/60">
                    {expense.category} · {formatCompetence(expense.competence)} · {formatDate(expense.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                  <Badge tone={feeStatusTone(expense.status)}>{expense.status.replace("_", " ")}</Badge>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
