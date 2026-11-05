"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { memberFinance } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import type { MemberStatus } from "@/types";

export default function MembersPage() {
  const { state, upsertMember } = useAppStore();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("80");
  const [dueDay, setDueDay] = useState("10");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<MemberStatus>("ativo");
  const [notes, setNotes] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    upsertMember({
      full_name: fullName,
      phone,
      email: email || undefined,
      monthly_fee_amount: Number(amount),
      due_day: Number(dueDay),
      entry_date: entryDate,
      status,
      admin_notes: notes || undefined,
    });
    setOpen(false);
    setFullName("");
    setPhone("");
    setEmail("");
    setNotes("");
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Membros</h1>
          <p className="text-sm text-navy/60">Cadastro e situação das mensalidades</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} size="md">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {open ? (
        <Card>
          <CardTitle>Novo membro</CardTitle>
          <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label>E-mail (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Valor da mensalidade</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label>Dia do vencimento</Label>
              <Input type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
            </div>
            <div>
              <Label>Data de entrada</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            </div>
            <div>
              <Label>Situação</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)}>
                <option value="ativo">Ativo</option>
                <option value="afastado">Afastado</option>
                <option value="isento">Isento</option>
                <option value="inativo">Inativo</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Observações administrativas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit">Salvar membro</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {state.members.map((member) => {
          const finance = memberFinance(member, state.monthlyFees);
          return (
            <Link key={member.id} href={`/membros/${member.id}`}>
              <Card className="transition hover:border-gold/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl text-navy">{member.full_name}</p>
                    <p className="text-sm text-navy/60">
                      Mensalidade {formatCurrency(member.monthly_fee_amount)} · dia {member.due_day}
                    </p>
                  </div>
                  <Badge tone={feeStatusTone(finance.situation)}>{finance.situation}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p className="text-navy/70">
                    Meses pendentes: <strong>{finance.overdueMonths}</strong>
                  </p>
                  <p className="text-right text-navy/70">
                    Total pendente: <strong>{formatCurrency(finance.pendingTotal)}</strong>
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
        {state.members.length === 0 ? (
          <EmptyState title="Nenhum membro" description="Cadastre o primeiro membro do barracão." />
        ) : null}
      </div>
    </div>
  );
}
