"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
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

  if (!apt || !client) return <EmptyState title="Atendimento não encontrado" />;

  if (currentUser?.role === "cliente" && currentUser.client_id !== apt.client_id) {
    return <EmptyState title="Acesso negado" />;
  }

  const duration =
    apt.started_at && apt.ended_at
      ? formatDuration(new Date(apt.ended_at).getTime() - new Date(apt.started_at).getTime())
      : null;

  const staff = currentUser?.role !== "cliente";

  return (
    <div className="animate-rise space-y-5">
      <div>
        <Link href="/agenda" className="text-sm text-navy/55 hover:text-navy">
          ← Agenda
        </Link>
        <h1 className="font-display text-3xl text-navy">{client.full_name}</h1>
        <p className="text-sm text-navy/60">{formatDateTime(apt.scheduled_at)}</p>
      </div>

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

      {staff ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {apt.status === "SOLICITADO" ? (
            <Button onClick={() => updateAppointmentStatus(apt.id, "CONFIRMADO")}>Confirmar</Button>
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
              <Button variant="danger" onClick={() => updateAppointmentStatus(apt.id, "NAO_COMPARECEU")}>
                Não compareceu
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {!staff && ["SOLICITADO", "CONFIRMADO"].includes(apt.status) ? (
        <Button variant="danger" className="w-full" onClick={() => cancelAppointment(apt.id)}>
          Cancelar consulta (libera horário para outros)
        </Button>
      ) : null}

      <Link href={staff ? `/conversas/${client.id}` : "/cliente/mensagens"}>
        <Button variant="secondary" className="w-full">Abrir conversa</Button>
      </Link>
    </div>
  );
}
