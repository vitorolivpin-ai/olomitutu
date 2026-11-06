"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import {
  appointmentPublicLabel,
  canSeeAppointmentFicha,
} from "@/lib/appointment-ficha";
import { formatCurrency, formatDateTime, formatDuration, formatTime } from "@/lib/format";

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    state,
    currentUser,
    updateAppointmentStatus,
    cancelAppointment,
    startAppointment,
    finishAppointment,
  } = useAppStore();

  const apt = state.appointments.find((a) => a.id === params.id);
  const client = state.clients.find((c) => c.id === apt?.client_id);

  if (!apt) return <EmptyState title="Atendimento não encontrado" />;

  if (currentUser?.role === "cliente") {
    return <EmptyState title="Acesso negado" />;
  }

  const canSeeFicha = canSeeAppointmentFicha(currentUser?.role, apt);
  const title = appointmentPublicLabel(apt, client?.full_name, currentUser);
  const ficha = apt.guest_ficha;

  const duration =
    apt.started_at && apt.ended_at
      ? formatDuration(new Date(apt.ended_at).getTime() - new Date(apt.started_at).getTime())
      : null;

  const isPai = currentUser?.role === "pai_de_santo";
  const staff = Boolean(currentUser);

  return (
    <div className="animate-rise space-y-5">
      <div>
        <Link href="/agenda" className="text-sm text-navy/55 hover:text-navy">
          ← Agenda
        </Link>
        <h1 className="font-display text-3xl text-navy">{title}</h1>
        <p className="text-sm text-navy/60">{formatDateTime(apt.scheduled_at)}</p>
        {apt.ficha_code ? (
          <p className="mt-1 text-xs font-medium text-gold-deep">Código {apt.ficha_code}</p>
        ) : null}
      </div>

      {apt.pai_only_ficha && !canSeeFicha ? (
        <Card className="border-l-4 border-l-gold">
          <CardTitle>Ficha restrita</CardTitle>
          <p className="mt-2 text-sm text-navy/70">
            Os dados pessoais desta marcação só o Pai de Santo pode ver. Você vê apenas o
            horário e o status.
          </p>
        </Card>
      ) : null}

      {canSeeFicha && ficha ? (
        <Card className="border-l-4 border-l-navy">
          <CardTitle>Ficha do agendamento</CardTitle>
          <p className="mt-1 text-xs text-navy/45">Visível somente para o Pai de Santo</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Nome</dt>
              <dd className="font-medium text-right">{ficha.full_name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Telefone</dt>
              <dd className="font-medium text-right">{ficha.phone}</dd>
            </div>
            {ficha.email ? (
              <div className="flex justify-between gap-3">
                <dt className="text-navy/55">E-mail</dt>
                <dd className="font-medium text-right">{ficha.email}</dd>
              </div>
            ) : null}
            {ficha.birth_date ? (
              <div className="flex justify-between gap-3">
                <dt className="text-navy/55">Nascimento</dt>
                <dd className="font-medium text-right">{ficha.birth_date}</dd>
              </div>
            ) : null}
            {ficha.observation ? (
              <div>
                <dt className="text-navy/55">Observação</dt>
                <dd className="mt-1 whitespace-pre-wrap text-navy/80">{ficha.observation}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      ) : null}

      {canSeeFicha && !ficha && client ? (
        <Card>
          <CardTitle>Cliente</CardTitle>
          <p className="mt-2 text-sm text-navy/70">{client.full_name}</p>
          <p className="text-sm text-navy/55">{client.phone}</p>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Status</CardTitle>
          <Badge tone={feeStatusTone(apt.status)}>{apt.status.replaceAll("_", " ")}</Badge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-navy/55">Valor</dt>
            <dd className="font-semibold">{formatCurrency(apt.amount ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-navy/55">Duração prevista</dt>
            <dd>{apt.duration_minutes} min</dd>
          </div>
          <div>
            <dt className="text-navy/55">Início</dt>
            <dd>{apt.started_at ? formatTime(apt.started_at) : "—"}</dd>
          </div>
          <div>
            <dt className="text-navy/55">Fim</dt>
            <dd>{apt.ended_at ? formatTime(apt.ended_at) : "—"}</dd>
          </div>
        </dl>
        {duration ? (
          <p className="mt-4 rounded-2xl bg-leaf/10 px-4 py-3 font-display text-xl text-leaf">
            Duração: {duration}
          </p>
        ) : null}
      </Card>

      {staff && (isPai || !apt.pai_only_ficha) ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {apt.status === "SOLICITADO" ? (
            <Button onClick={() => updateAppointmentStatus(apt.id, "CONFIRMADO")}>
              Confirmar
            </Button>
          ) : null}
          {["CONFIRMADO", "SOLICITADO"].includes(apt.status) ? (
            <Button variant="gold" onClick={() => startAppointment(apt.id)}>
              Iniciar atendimento
            </Button>
          ) : null}
          {apt.status === "EM_ATENDIMENTO" ? (
            <Button variant="gold" onClick={() => finishAppointment(apt.id)}>
              Finalizar atendimento
            </Button>
          ) : null}
          {["SOLICITADO", "CONFIRMADO"].includes(apt.status) ? (
            <>
              <Button variant="secondary" onClick={() => cancelAppointment(apt.id)}>
                Cancelar (libera horário)
              </Button>
              <Button
                variant="danger"
                onClick={() => updateAppointmentStatus(apt.id, "NAO_COMPARECEU")}
              >
                Não compareceu
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
