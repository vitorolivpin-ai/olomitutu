"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { PublicBottomNav } from "@/components/hub/public-bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { saveGuestChatSession } from "@/lib/guest-chat-session";
import {
  loadGuestJogoSession,
  patchGuestJogoSession,
  saveGuestJogoSession,
} from "@/lib/guest-jogo-session";
import { modalidadeLabel } from "@/lib/jogo";

/**
 * Acesso temporário do visitante após aprovação — só o token deste atendimento.
 * Sem listar clientes, agenda ou outros Jogos.
 */
export default function MarcarAcessoTokenPage() {
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(params.token ?? "");
  const { resolveJogoAccess, refreshJogoDeadlines } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    refreshJogoDeadlines();
    setReady(true);
  }, [refreshJogoDeadlines]);

  const entry = useMemo(
    () => (ready && token ? resolveJogoAccess(token) : null),
    [ready, token, resolveJogoAccess],
  );

  useEffect(() => {
    if (!entry) return;
    const existing = loadGuestJogoSession();
    if (existing?.appointmentId === entry.appointment_id) {
      patchGuestJogoSession({
        accessToken: entry.access_token,
        jogoStatus: entry.jogo_status,
      });
    } else {
      saveGuestJogoSession({
        appointmentId: entry.appointment_id,
        clientId: existing?.clientId ?? entry.appointment_id,
        fullName: existing?.fullName ?? "Visitante",
        phone: existing?.phone ?? "",
        email: existing?.email ?? "",
        fichaCode: entry.ficha_code,
        scheduledAt: entry.scheduled_at,
        modalidade: entry.modalidade,
        amount: entry.amount ?? 0,
        jogoStatus: entry.jogo_status,
        accessToken: entry.access_token,
      });
    }
    if (entry.chat_unlocked && existing?.clientId) {
      saveGuestChatSession({
        clientId: existing.clientId,
        fullName: existing.fullName,
        phone: existing.phone,
        fichaCode: entry.ficha_code,
      });
    }
  }, [entry]);

  if (!ready) {
    return <p className="p-8 text-center text-sm text-navy/50">Validando acesso…</p>;
  }

  if (!entry) {
    return (
      <div className="relative min-h-dvh bg-background px-4 py-6">
        <BrandWatermarks />
        <div className="relative z-10 mx-auto max-w-md pb-28">
          <BrandPageHeader title="Acesso inválido" backHref="/marcar" />
          <EmptyState
            title="Link expirado ou revogado"
            description="Solicite um novo acesso ao Pai de Santo pelo e-mail da marcação."
          />
        </div>
        <PublicBottomNav />
      </div>
    );
  }

  const online = entry.modalidade === "online";

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background">
      <BrandWatermarks />
      <div className="relative z-10 mx-auto w-full max-w-lg px-4 py-6 pb-28 sm:px-6">
        <BrandPageHeader
          title="Seu atendimento"
          subtitle="Acesso temporário exclusivo deste Jogo"
          backHref="/marcar"
        />

        <Card className="mt-5 border-l-4 border-l-leaf">
          <CardTitle>Jogo confirmado</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Quando</dt>
              <dd className="font-medium text-right">{formatDateTime(entry.scheduled_at)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Modalidade</dt>
              <dd className="font-medium">{modalidadeLabel(entry.modalidade)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Código</dt>
              <dd className="font-medium">{entry.ficha_code || "—"}</dd>
            </div>
            {entry.amount != null ? (
              <div className="flex justify-between gap-3">
                <dt className="text-navy/55">Valor</dt>
                <dd className="font-medium">{formatCurrency(entry.amount)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 space-y-2">
            {entry.chat_unlocked ? (
              <Link href="/marcar/chat">
                <Button variant="gold" className="w-full min-h-11">
                  Abrir chat com o Pai de Santo
                </Button>
              </Link>
            ) : (
              <p className="text-sm text-navy/60">Chat ainda não liberado.</p>
            )}

            {online ? (
              <Button className="w-full min-h-11" disabled>
                Entrar no Jogo
              </Button>
            ) : null}
            {online ? (
              <p className="text-center text-xs text-navy/50">
                Disponível no horário do atendimento (voz/vídeo em etapa futura).
              </p>
            ) : null}
          </div>
        </Card>
      </div>
      <PublicBottomNav />
    </div>
  );
}
