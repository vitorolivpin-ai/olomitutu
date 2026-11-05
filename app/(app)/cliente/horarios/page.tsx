"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { buildSlotViews } from "@/lib/slots";

export default function ClienteHorariosPage() {
  const { state, currentUser, createAppointment, cancelAppointment, markNotificationRead } =
    useAppStore();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const clientId = currentUser?.client_id;

  const views = useMemo(
    () => buildSlotViews(state.publishedSlots ?? [], state.appointments),
    [state.publishedSlots, state.appointments],
  );
  const livres = views.filter((v) => v.status === "livre");
  const ocupados = views.filter((v) => v.status === "ocupado");

  const myList = state.appointments
    .filter((a) => a.client_id === clientId)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const freedAlerts = state.notifications
    .filter(
      (n) =>
        !n.read &&
        n.type === "agenda" &&
        (n.audience?.includes("cliente") ||
          n.title.toLowerCase().includes("liberado") ||
          n.title.toLowerCase().includes("disponível")),
    )
    .slice(0, 5);

  if (currentUser?.role !== "cliente" || !clientId) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  function book(scheduledAt: string) {
    if (!clientId) return;
    setError("");
    setOk("");
    const result = createAppointment({ client_id: clientId, scheduled_at: scheduledAt });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Solicitação enviada. Aguarde a confirmação da casa.");
  }

  function onCancel(id: string) {
    cancelAppointment(id);
    setOk("Consulta cancelada. O horário foi liberado e todos foram avisados.");
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <p className="text-sm font-medium text-gold-deep">App do Cliente</p>
        <h1 className="font-display text-3xl text-navy">Meus horários</h1>
        <p className="text-sm text-navy/60">
          Horários publicados pela casa. Ocupados não podem ser marcados.
        </p>
      </div>

      {freedAlerts.length > 0 ? (
        <Card className="border-l-4 border-l-gold space-y-2">
          <CardTitle>Horários liberados</CardTitle>
          {freedAlerts.map((n) => (
            <button
              key={n.id}
              type="button"
              className="block w-full rounded-2xl bg-mist/70 p-3 text-left text-sm text-navy"
              onClick={() => markNotificationRead(n.id)}
            >
              {n.body}
            </button>
          ))}
        </Card>
      ) : null}

      {error ? <ErrorMessage message={error} /> : null}
      {ok ? <p className="text-sm text-success">{ok}</p> : null}

      <Card>
        <CardTitle>Disponíveis para marcar</CardTitle>
        <div className="mt-3 grid gap-2">
          {livres.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-mist/70 p-3"
            >
              <div>
                <p className="font-medium text-navy">{formatDateTime(slot.scheduled_at)}</p>
                <p className="text-xs text-navy/55">{slot.duration_minutes} min · Livre</p>
              </div>
              <Button size="sm" onClick={() => book(slot.scheduled_at)}>
                Marcar
              </Button>
            </div>
          ))}
          {livres.length === 0 ? (
            <p className="text-sm text-navy/55">Nenhum horário livre no momento.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardTitle>Ocupados</CardTitle>
        <div className="mt-3 grid gap-2">
          {ocupados.map((slot) => {
            const mine = slot.appointment?.client_id === clientId;
            return (
              <div
                key={slot.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-navy/5 p-3"
              >
                <div>
                  <p className="font-medium text-navy/70">{formatDateTime(slot.scheduled_at)}</p>
                  <p className="text-xs text-navy/45">
                    {mine ? "Seu horário" : "Ocupado"} · {slot.duration_minutes} min
                  </p>
                </div>
                <Badge tone="warning">OCUPADO</Badge>
              </div>
            );
          })}
          {ocupados.length === 0 ? (
            <p className="text-sm text-navy/55">Nenhum horário ocupado.</p>
          ) : null}
        </div>
      </Card>

      <div>
        <h2 className="font-display text-2xl text-navy">Minhas consultas</h2>
        <div className="mt-3 grid gap-3">
          {myList.map((apt) => (
            <Card key={apt.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-navy">{formatDateTime(apt.scheduled_at)}</p>
                  <p className="text-xs text-navy/55">{apt.duration_minutes} min</p>
                </div>
                <Badge tone={feeStatusTone(apt.status)}>{apt.status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Link href={`/atendimentos/${apt.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Ver detalhes
                  </Button>
                </Link>
                {["SOLICITADO", "CONFIRMADO"].includes(apt.status) ? (
                  <Button variant="danger" className="flex-1" onClick={() => onCancel(apt.id)}>
                    Cancelar consulta
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
          {myList.length === 0 ? (
            <EmptyState title="Nenhuma consulta" description="Marque um horário disponível acima." />
          ) : null}
        </div>
      </div>
    </div>
  );
}
