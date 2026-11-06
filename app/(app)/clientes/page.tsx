"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDate } from "@/lib/format";

export default function ClientsPage() {
  const { state, upsertClient, removeClient, currentUser } = useAppStore();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canManage =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";

  const clients =
    currentUser?.role === "cliente"
      ? state.clients.filter((c) => c.id === currentUser.client_id)
      : currentUser?.role === "pai_de_santo"
        ? state.clients
        : // Marcação pública: ficha/guest só o Pai vê na lista
          state.clients.filter((c) => !c.is_guest);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    upsertClient({
      full_name: fullName,
      phone,
      email: email || undefined,
      notes: notes || undefined,
    });
    setOpen(false);
    setFullName("");
    setPhone("");
    setEmail("");
    setNotes("");
  }

  async function onDelete(clientId: string, name: string) {
    if (
      !confirm(
        `Excluir “${name}” da lista de clientes?\n\nIsso remove jogos, mensagens e anotações ligados a esta pessoa.`,
      )
    ) {
      return;
    }
    setError("");
    setDeletingId(clientId);
    const result = await removeClient(clientId);
    setDeletingId(null);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Clientes de jogo</h1>
          <p className="text-sm text-navy/60">Separado dos membros do barracão</p>
        </div>
        {currentUser?.role !== "cliente" ? (
          <Button size="md" onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {open ? (
        <Card>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações autorizadas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {clients.map((client) => {
          const games = state.appointments.filter(
            (a) => a.client_id === client.id && a.status === "REALIZADO",
          ).length;
          return (
            <Card key={client.id} className="hover:border-gold/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/clientes/${client.id}`} className="min-w-0 flex-1">
                  <p className="font-display text-xl text-navy">{client.full_name}</p>
                  <p className="text-sm text-navy/60">
                    {client.phone} · desde {formatDate(client.created_at)} · {games} jogos
                  </p>
                </Link>
                {canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={deletingId === client.id}
                    onClick={() => void onDelete(client.id, client.full_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === client.id ? "Excluindo…" : "Excluir"}
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
        {clients.length === 0 ? <EmptyState title="Nenhum cliente" /> : null}
      </div>
    </div>
  );
}
