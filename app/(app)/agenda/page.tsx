"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { buildSlotViews } from "@/lib/slots";

export default function AgendaPage() {
  const {
    state,
    currentUser,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
  } = useAppStore();
  const [clientId, setClientId] = useState(state.clients[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const livres = useMemo(
    () =>
      buildSlotViews(state.publishedSlots ?? [], state.appointments).filter(
        (s) => s.status === "livre",
      ),
    [state.publishedSlots, state.appointments],
  );

  const list = state.appointments
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!clientId || !scheduledAt) {
      setError("Selecione cliente e horário.");
      return;
    }
    const result = createAppointment({
      client_id: clientId,
      scheduled_at: scheduledAt,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Agendamento criado.");
    setScheduledAt("");
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Agenda</h1>
          <p className="text-sm text-navy/60">Jogos e atendimentos</p>
        </div>
        <Link href="/disponibilidade">
          <Button variant="gold" size="md">
            Gerenciar horários
          </Button>
        </Link>
      </div>

      <Card>
        <CardTitle>Novo agendamento</CardTitle>
        <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Cliente</Label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Horário livre</Label>
            <Select value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}>
              <option value="">Selecione...</option>
              {livres.map((s) => (
                <option key={s.id} value={s.scheduled_at}>
                  {formatDateTime(s.scheduled_at)}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            {error ? <ErrorMessage message={error} /> : null}
            {ok ? <p className="mb-2 text-sm text-success">{ok}</p> : null}
            <Button type="submit">Agendar</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-navy/50">
          Os horários vêm da aba Horários disponíveis. Publique novos lá para o cliente ver.
        </p>
      </Card>

      <div className="grid gap-3">
        {list.map((apt) => {
          const client = state.clients.find((c) => c.id === apt.client_id);
          return (
            <Card key={apt.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-navy">{client?.full_name}</p>
                  <p className="text-sm text-navy/60">{formatDateTime(apt.scheduled_at)}</p>
                </div>
                <Badge tone={feeStatusTone(apt.status)}>{apt.status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/atendimentos/${apt.id}`}>
                  <Button size="sm">Abrir</Button>
                </Link>
                {apt.status === "SOLICITADO" ? (
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => updateAppointmentStatus(apt.id, "CONFIRMADO")}
                  >
                    Confirmar
                  </Button>
                ) : null}
                {["SOLICITADO", "CONFIRMADO"].includes(apt.status) ? (
                  <Button size="sm" variant="secondary" onClick={() => cancelAppointment(apt.id)}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
