"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { isClienteDeJogo, isFilhoDeSanto } from "@/lib/filho";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { buildSlotViews } from "@/lib/slots";

export default function ClienteHorariosPage() {
  const { state, currentUser, createAppointment } = useAppStore();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const clientId = currentUser?.client_id;
  const allowed =
    !!currentUser &&
    currentUser.role === "cliente" &&
    !isFilhoDeSanto(currentUser) &&
    isClienteDeJogo(currentUser) &&
    !!clientId;

  const mine = useMemo(
    () =>
      (state.appointments ?? [])
        .filter((a) => a.client_id === clientId)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
        ),
    [state.appointments, clientId],
  );

  const freeSlots = useMemo(
    () =>
      buildSlotViews(state.publishedSlots ?? [], state.appointments ?? []).filter(
        (v) => v.status === "livre",
      ),
    [state.publishedSlots, state.appointments],
  );

  const amount = 150;

  if (!allowed || !clientId) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  const myClientId = clientId;

  function book(scheduledAt: string) {
    setError("");
    setOk("");
    const result = createAppointment({
      client_id: myClientId,
      scheduled_at: scheduledAt,
      amount,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(`Horário reservado: ${formatDateTime(scheduledAt)}`);
  }

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-5">
      <div className="flex items-start gap-4">
        <BrandMark className="h-14 w-14 shrink-0" />
        <div>
          <Link href="/cliente" className="text-sm text-navy/55 hover:text-navy">
            ← Início
          </Link>
          <p className="mt-1 text-sm font-medium text-gold-deep">App do Cliente</p>
          <h1 className="font-display text-3xl text-navy">Agenda</h1>
          <p className="text-sm text-navy/60">
            Marque e acompanhe seus horários. Quem não tem conta usa{" "}
            <Link href="/marcar" className="underline">
              Marcar horário
            </Link>{" "}
            no início.
          </p>
        </div>
      </div>

      {error ? <ErrorMessage message={error} /> : null}
      {ok ? (
        <p className="rounded-lg bg-leaf/15 px-3 py-2 text-sm text-navy">{ok}</p>
      ) : null}

      <Card>
        <CardTitle>Horários livres</CardTitle>
        <p className="mt-1 text-xs text-navy/50">
          Valor de referência: {formatCurrency(amount)}. Pix da casa após a reserva.
        </p>
        {freeSlots.length === 0 ? (
          <p className="mt-3 text-sm text-navy/60">Nenhum horário publicado no momento.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {freeSlots.map((slot) => (
              <li
                key={slot.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy/10 px-3 py-2"
              >
                <span className="text-sm text-navy">
                  {formatDateTime(slot.scheduled_at)}
                </span>
                <Button variant="gold" onClick={() => book(slot.scheduled_at)}>
                  Marcar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Seus horários</CardTitle>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-navy/60">Você ainda não marcou nenhum horário.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.map((apt) => (
              <li
                key={apt.id}
                className="rounded-xl bg-mist/50 px-3 py-2 text-sm text-navy"
              >
                <p className="font-medium">{formatDateTime(apt.scheduled_at)}</p>
                <p className="text-xs text-navy/50">
                  {apt.status}
                  {apt.amount != null ? ` · ${formatCurrency(apt.amount)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-l-4 border-l-gold">
        <CardTitle className="text-lg">Chat com Vitor Cardozo - Ògún Yande</CardTitle>
        <p className="mt-2 text-sm text-navy/65">
          Dúvidas do jogo ou combinação de detalhes.
        </p>
        <Link href="/cliente/mensagens" className="mt-3 block">
          <Button variant="secondary" className="w-full">
            Abrir chat
          </Button>
        </Link>
      </Card>
    </div>
  );
}
