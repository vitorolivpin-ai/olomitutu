"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { GoogleCalendarCard } from "@/components/agenda/google-calendar-card";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import {
  pushAppointmentToGoogle,
  removeAppointmentFromGoogle,
} from "@/lib/google/appointment-sync";
import { appointmentPublicLabel } from "@/lib/appointment-ficha";
import { formatDateTime } from "@/lib/format";
import { buildSlotViews } from "@/lib/slots";

export default function AgendaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-navy/50">Carregando agenda…</p>}>
      <AgendaPageInner />
    </Suspense>
  );
}

function AgendaPageInner() {
  const {
    state,
    currentUser,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    patchAppointment,
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

  async function onCreate(e: FormEvent) {
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
    const client = state.clients.find((c) => c.id === clientId);
    const eventId = await pushAppointmentToGoogle(result.appointment, client);
    if (eventId) {
      patchAppointment(result.appointment.id, { google_event_id: eventId });
      setOk("Agendamento criado e enviado ao Google Calendar.");
    } else {
      setOk("Agendamento criado. (Google não sincronizou — conecte a agenda se ainda não conectou.)");
    }
    setScheduledAt("");
  }

  async function onCancel(id: string) {
    const current = state.appointments.find((a) => a.id === id);
    const updated = cancelAppointment(id);
    if (updated) await removeAppointmentFromGoogle(current ?? updated);
  }

  async function onConfirm(id: string) {
    const updated = updateAppointmentStatus(id, "CONFIRMADO");
    if (!updated) return;
    const client = state.clients.find((c) => c.id === updated.client_id);
    const eventId = await pushAppointmentToGoogle(updated, client);
    if (eventId) patchAppointment(id, { google_event_id: eventId });
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader title="Agenda" subtitle="Jogos e atendimentos" />
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/disponibilidade">
          <Button variant="gold" size="md">
            Gerenciar horários
          </Button>
        </Link>
      </div>

      {currentUser?.role === "pai_de_santo" ? (
        <GoogleCalendarCard />
      ) : null}

      <Card>
        <CardTitle>Novo agendamento</CardTitle>
        <form onSubmit={(e) => void onCreate(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
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
          const label = appointmentPublicLabel(apt, client?.full_name, currentUser);
          const isPai = currentUser?.role === "pai_de_santo";
          const guestLocked = Boolean(apt.pai_only_ficha) && !isPai;
          return (
            <Card key={apt.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-navy">{label}</p>
                  <p className="text-sm text-navy/60">{formatDateTime(apt.scheduled_at)}</p>
                  {guestLocked ? (
                    <p className="mt-1 text-xs text-navy/45">
                      Ficha pessoal só o Pai de Santo abre
                    </p>
                  ) : null}
                  {apt.google_event_id ? (
                    <p className="mt-1 text-xs text-success">No Google Calendar</p>
                  ) : null}
                </div>
                <Badge tone={feeStatusTone(apt.status)}>{apt.status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/atendimentos/${apt.id}`}>
                  <Button size="sm">{guestLocked ? "Ver status" : "Abrir ficha"}</Button>
                </Link>
                {apt.status === "SOLICITADO" && (isPai || !apt.pai_only_ficha) ? (
                  <Button size="sm" variant="gold" onClick={() => void onConfirm(apt.id)}>
                    Confirmar
                  </Button>
                ) : null}
                {["SOLICITADO", "CONFIRMADO"].includes(apt.status) &&
                (isPai || !apt.pai_only_ficha) ? (
                  <Button size="sm" variant="secondary" onClick={() => void onCancel(apt.id)}>
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
