"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, LoadingBlock } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";
import { roleLabel } from "@/lib/permissions";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ApprovalStatus, UserRole } from "@/types";

type PendingRow = {
  id: string;
  full_name: string;
  email: string;
  requested_role: UserRole;
  approval_status: ApprovalStatus;
  created_at: string;
};

export default function CadastrosPendentesPage() {
  const { currentUser } = useAppStore();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApprove =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !canApprove) {
      setLoading(false);
      return;
    }
    const supabase = createBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: qError } = await supabase
      .from("profiles")
      .select("id, full_name, email, requested_role, approval_status, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true });

    if (qError) {
      setError(qError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as PendingRow[]);
    }
    setLoading(false);
  }, [canApprove]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "approved" | "rejected", requested: UserRole) {
    const supabase = createBrowserClient();
    if (!supabase) return;
    setBusyId(id);
    setError(null);

    const payload =
      decision === "approved"
        ? {
            approval_status: "approved" as const,
            role: requested,
            updated_at: new Date().toISOString(),
          }
        : {
            approval_status: "rejected" as const,
            updated_at: new Date().toISOString(),
          };

    const { error: upError } = await supabase.from("profiles").update(payload).eq("id", id);
    setBusyId(null);

    if (upError) {
      setError(upError.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (!currentUser) {
    return <EmptyState title="Faça login para ver cadastros" />;
  }

  if (!canApprove) {
    return <EmptyState title="Só o Pai de Santo (ou Admin) aprova cadastros" />;
  }

  if (!isSupabaseConfigured()) {
    return (
      <EmptyState
        title="Aprovações precisam do Supabase"
        description="No modo demo as contas já vêm liberadas."
      />
    );
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="animate-rise space-y-5">
      <div>
        <h1 className="font-display text-3xl text-navy">Cadastros pendentes</h1>
        <p className="mt-1 text-sm text-navy/60">
          Aceite ou recuse quem pediu acesso às áreas da casa (Financeiro, Estoque,
          Admin…).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <CardTitle>Nenhum cadastro aguardando</CardTitle>
          <p className="mt-2 text-sm text-navy/60">Quando alguém se cadastrar, aparece aqui.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="truncate">{row.full_name}</CardTitle>
                  <p className="mt-1 text-sm text-navy/65">{row.email}</p>
                  <p className="mt-1 text-sm font-medium text-gold-deep">
                    Pediu: {roleLabel(row.requested_role)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="gold"
                    disabled={busyId === row.id}
                    onClick={() => void decide(row.id, "approved", row.requested_role)}
                  >
                    Aceitar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busyId === row.id}
                    onClick={() => void decide(row.id, "rejected", row.requested_role)}
                  >
                    Recusar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button variant="ghost" onClick={() => void load()}>
        Atualizar lista
      </Button>
    </div>
  );
}
