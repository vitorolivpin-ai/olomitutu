"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDate } from "@/lib/format";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Client } from "@/types";

export default function ClientsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-navy/50">Carregando…</p>}>
      <ClientsPageInner />
    </Suspense>
  );
}

function ClientsPageInner() {
  const {
    state,
    upsertClient,
    removeClient,
    claimUnassignedClient,
    currentUser,
    refreshCloudChat,
  } = useAppStore();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("novo") === "1") setOpen(true);
  }, [searchParams]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [unassigned, setUnassigned] = useState<Client[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const canManage =
    currentUser?.role === "pai_de_santo";

  const loadUnassigned = useCallback(async () => {
    if (currentUser?.role !== "pai_de_santo") return;
    if (!isSupabaseConfigured()) {
      setUnassigned(state.clients.filter((client) => !client.responsible_profile_id));
      return;
    }
    const supabase = createBrowserClient();
    if (!supabase) return;
    const { data, error: queryError } = await supabase.rpc("list_unassigned_clients");
    if (queryError) {
      setError("Não foi possível carregar registros pendentes de associação.");
      return;
    }
    setUnassigned((data ?? []) as Client[]);
  }, [currentUser?.role, state.clients]);

  useEffect(() => {
    void loadUnassigned();
  }, [loadUnassigned]);

  if (currentUser?.role !== "pai_de_santo") {
    return <EmptyState title="Acesso não autorizado" />;
  }

  const clients = state.clients.filter(
    (client) => client.responsible_profile_id === currentUser.id,
  );

  async function claimClient(clientId: string) {
    setClaimingId(clientId);
    const claimed = await claimUnassignedClient(clientId);
    setClaimingId(null);
    if (!claimed) {
      setError("Não foi possível associar este cadastro. Atualize e tente novamente.");
      return;
    }
    setUnassigned((items) => items.filter((client) => client.id !== clientId));
    if (isSupabaseConfigured()) await refreshCloudChat();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const saved = await upsertClient({
      full_name: fullName,
      phone,
      email: email || undefined,
      notes: notes || undefined,
    });
    if (!saved) {
      setError("Não foi possível salvar este cadastro.");
      return;
    }
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
      <BrandPageHeader
        title="Clientes de jogo"
        subtitle="Separado dos membros do barracão"
      />
      <div className="flex justify-center gap-3 empty:hidden">
        {currentUser?.role !== "cliente" ? (
          <Button size="md" onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {unassigned.length > 0 ? (
        <Card>
          <CardTitle>Registros pendentes de associação</CardTitle>
          <p className="mt-1 text-sm text-navy/60">
            Confirme manualmente quais registros pertencem aos seus atendimentos.
          </p>
          <ul className="mt-3 space-y-2">
            {unassigned.map((client) => (
              <li key={client.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 pt-3">
                <span className="min-w-0 text-sm text-navy">{client.full_name}</span>
                <Button
                  type="button"
                  size="sm"
                  disabled={claimingId === client.id}
                  onClick={() => void claimClient(client.id)}
                >
                  {claimingId === client.id ? "Associando…" : "Associar"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

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
