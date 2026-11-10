"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, LoadingBlock } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";
import {
  personKindLabel,
  roleGrantedOnApproval,
} from "@/lib/approvals";
import { areaTitle } from "@/lib/demo-accounts";
import { roleLabel } from "@/lib/permissions";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ApprovalStatus, PersonKind, UserRole } from "@/types";

type PendingRow = {
  id: string;
  full_name: string;
  email: string;
  requested_role: UserRole;
  signup_area: UserRole | null;
  person_kind: PersonKind | null;
  approval_status: ApprovalStatus;
  created_at: string;
};

export default function CadastrosPendentesPage() {
  const { currentUser, upsertMember, state } = useAppStore();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApprove = currentUser?.role === "pai_de_santo";

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
      .select(
        "id, full_name, email, requested_role, signup_area, person_kind, approval_status, created_at",
      )
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

  async function decide(row: PendingRow, decision: "approved" | "rejected") {
    const supabase = createBrowserClient();
    if (!supabase) return;
    setBusyId(row.id);
    setError(null);

    const { error: upError } = await supabase.rpc("decide_profile_approval", {
      p_profile_id: row.id,
      p_decision: decision,
    });
    setBusyId(null);

    if (upError) {
      setError(upError.message);
      return;
    }

    if (decision === "approved" && row.person_kind === "filho_de_santo") {
      const existing = state.members.find((m) => m.profile_id === row.id);
      if (!existing) {
        const byEmail = state.members.find(
          (m) =>
            m.email?.toLowerCase() === row.email.toLowerCase() && !m.profile_id,
        );
        if (byEmail) {
          upsertMember({ ...byEmail, profile_id: row.id, email: row.email });
        } else {
          upsertMember({
            full_name: row.full_name,
            phone: "a definir",
            email: row.email,
            monthly_fee_amount: 80,
            due_day: 10,
            entry_date: new Date().toISOString().slice(0, 10),
            status: "ativo",
            profile_id: row.id,
            checklist_level: "abian",
          });
        }
      }
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  if (!currentUser) {
    return <EmptyState title="Faça login para ver cadastros" />;
  }

  if (!canApprove) {
    return <EmptyState title="Somente o Pai de Santo aprova cadastros" />;
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
      <BrandPageHeader
        title="Cadastros pendentes"
        subtitle="Cada cadastro libera a aba em que a pessoa se inscreveu (Estoque, Biblioteca, etc.). O tipo (Filho de Santo / Cliente / Admin) é só informação."
      />

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
          {rows.map((row) => {
            const area = row.signup_area ?? row.requested_role;
            return (
              <Card key={row.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{row.full_name}</CardTitle>
                    <p className="mt-1 text-sm text-navy/65">{row.email}</p>
                    <p className="mt-2 text-base font-semibold text-navy">
                      Libera aba:{" "}
                      <span className="text-gold-deep">
                        {areaTitle(area)} ({roleLabel(
                          roleGrantedOnApproval({
                            requested_role: row.requested_role,
                            signup_area: row.signup_area,
                            person_kind: row.person_kind,
                          }),
                        )})
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-navy/50">
                      Tipo informado: {personKindLabel(row.person_kind)} (só
                      referência — não muda a aba)
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="gold"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row, "approved")}
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row, "rejected")}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Button variant="ghost" onClick={() => void load()}>
        Atualizar lista
      </Button>
    </div>
  );
}
