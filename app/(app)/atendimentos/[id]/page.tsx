"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import {
  appointmentPublicLabel,
  canSeeAppointmentFicha,
} from "@/lib/appointment-ficha";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatTime,
} from "@/lib/format";
import {
  jogoStatusLabel,
  modalidadeLabel,
  visitorAccessPath,
} from "@/lib/jogo";

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    state,
    currentUser,
    updateAppointmentStatus,
    cancelAppointment,
    startAppointment,
    finishAppointment,
    paiDecideJogo,
    refreshJogoDeadlines,
  } = useAppStore();
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailNote, setEmailNote] = useState("");

  const apt = state.appointments.find((a) => a.id === params.id);
  const client = state.clients.find((c) => c.id === apt?.client_id);

  if (
    currentUser?.role !== "pai_de_santo" ||
    !apt ||
    !client ||
    client.responsible_profile_id !== currentUser.id
  ) {
    return <EmptyState title="Acesso não autorizado" />;
  }

  const canSeeFicha = canSeeAppointmentFicha(currentUser?.role, apt);
  const title = appointmentPublicLabel(apt, client?.full_name, currentUser);
  const ficha = apt.guest_ficha;
  const isJogo = Boolean(apt.pai_only_ficha || apt.jogo_status);

  const duration =
    apt.started_at && apt.ended_at
      ? formatDuration(
          new Date(apt.ended_at).getTime() - new Date(apt.started_at).getTime(),
        )
      : null;

  async function sendStatusEmail(
    event: "confirmado" | "recusado" | "novo_comprovante",
    accessToken?: string,
  ) {
    const to = ficha?.email;
    if (!to) {
      setEmailNote("Sem e-mail na ficha — comunicação não enviada.");
      return;
    }
    try {
      const res = await fetch("/api/email/jogo-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          event,
          scheduled_at: apt!.scheduled_at,
          modalidade: apt!.modalidade,
          access_token: accessToken,
          ficha_code: apt!.ficha_code,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      setEmailNote(
        json.ok
          ? "E-mail preparado/enviado."
          : json.error || "E-mail não enviado (verifique RESEND_API_KEY).",
      );
    } catch {
      setEmailNote("Falha de rede ao preparar e-mail.");
    }
  }

  async function onDecide(decision: "aprovar" | "recusar" | "novo_comprovante") {
    setActionError("");
    setBusy(true);
    refreshJogoDeadlines();
    const result = paiDecideJogo({ appointment_id: apt!.id, decision });
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    if (result.email_event === "confirmado") {
      await sendStatusEmail("confirmado", result.access_token);
    } else if (result.email_event === "recusado") {
      await sendStatusEmail("recusado");
    } else if (result.email_event === "novo_comprovante") {
      await sendStatusEmail("novo_comprovante");
    }
  }

  const awaitingPai =
    apt.jogo_status === "aguardando_aprovacao" ||
    apt.jogo_status === "prazo_analise_atingido" ||
    apt.jogo_status === "comprovante_enviado";

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BrandPageHeader
          title={title}
          subtitle={formatDateTime(apt.scheduled_at)}
          backHref="/agenda"
          backLabel="Agenda"
        />
        {apt.ficha_code ? (
          <p className="mt-1 text-center text-xs font-medium text-gold-deep">
            Código {apt.ficha_code}
          </p>
        ) : null}
      </div>

      {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}
      {emailNote ? <p className="text-sm text-navy/60">{emailNote}</p> : null}

      {apt.analysis_deadline_reached ? (
        <Card className="border-l-4 border-l-warning">
          <CardTitle>Prazo de análise atingido</CardTitle>
          <p className="mt-2 text-sm text-navy/70">
            Passaram-se 24 horas desde o comprovante. A decisão continua com você — sem
            aprovação automática.
          </p>
        </Card>
      ) : null}

      {canSeeFicha && ficha ? (
        <Card className="border-l-4 border-l-navy">
          <CardTitle>Dados</CardTitle>
          <p className="mt-1 text-xs text-navy/45">Visível somente para o Pai de Santo</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Nome</dt>
              <dd className="font-medium text-right">{ficha.full_name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Nascimento</dt>
              <dd className="font-medium text-right">{ficha.birth_date || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">WhatsApp</dt>
              <dd className="font-medium text-right">{ficha.phone}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">E-mail</dt>
              <dd className="font-medium text-right">{ficha.email || "—"}</dd>
            </div>
            {ficha.observation ? (
              <div>
                <dt className="text-navy/55">Observação</dt>
                <dd className="mt-1 whitespace-pre-wrap text-navy/80">{ficha.observation}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Jogo</CardTitle>
          <Badge tone={feeStatusTone(apt.status)}>
            {apt.jogo_status
              ? jogoStatusLabel(apt.jogo_status)
              : apt.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-navy/55">Modalidade</dt>
            <dd className="font-semibold">{modalidadeLabel(apt.modalidade)}</dd>
          </div>
          <div>
            <dt className="text-navy/55">Data / horário</dt>
            <dd className="font-semibold">{formatDateTime(apt.scheduled_at)}</dd>
          </div>
          <div>
            <dt className="text-navy/55">Valor</dt>
            <dd className="font-semibold">{formatCurrency(apt.amount ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-navy/55">Solicitação</dt>
            <dd>{formatDateTime(apt.created_at)}</dd>
          </div>
          <div>
            <dt className="text-navy/55">Duração prevista</dt>
            <dd>{apt.duration_minutes} min</dd>
          </div>
          {apt.analysis_deadline_at ? (
            <div>
              <dt className="text-navy/55">Prazo de análise</dt>
              <dd>{formatDateTime(apt.analysis_deadline_at)}</dd>
            </div>
          ) : null}
        </dl>
        {duration ? (
          <p className="mt-4 rounded-2xl bg-leaf/10 px-4 py-3 font-display text-xl text-leaf">
            Duração: {duration}
          </p>
        ) : null}
      </Card>

      {isJogo ? (
        <Card className="border-l-4 border-l-gold">
          <CardTitle>Pagamento</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Status</dt>
              <dd className="font-medium">{jogoStatusLabel(apt.jogo_status)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy/55">Envio do comprovante</dt>
              <dd>
                {apt.proof_uploaded_at ? formatDateTime(apt.proof_uploaded_at) : "—"}
              </dd>
            </div>
          </dl>
          {apt.payment_proof ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-navy/50">
                {apt.payment_proof.file_name} ·{" "}
                {Math.round(apt.payment_proof.size_bytes / 1024)} KB · privado
              </p>
              {apt.payment_proof.data_url?.startsWith("data:image") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={apt.payment_proof.data_url}
                  alt="Comprovante do Jogo"
                  className="max-h-80 w-full rounded-xl object-contain ring-1 ring-navy/10"
                />
              ) : apt.payment_proof.data_url ? (
                <a
                  href={apt.payment_proof.data_url}
                  download={apt.payment_proof.file_name}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-deep"
                >
                  Baixar comprovante (PDF)
                </a>
              ) : (
                <p className="text-sm text-navy/60">
                  Arquivo no bucket privado (URL assinada em etapa remota).
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-navy/55">Nenhum comprovante anexado.</p>
          )}
        </Card>
      ) : null}

      {isJogo && awaitingPai ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="gold"
            className="min-h-11"
            disabled={busy}
            onClick={() => void onDecide("aprovar")}
          >
            Aprovar Jogo
          </Button>
          <Button
            variant="secondary"
            className="min-h-11"
            disabled={busy}
            onClick={() => void onDecide("novo_comprovante")}
          >
            Solicitar novo comprovante
          </Button>
          <Button
            variant="danger"
            className="min-h-11 sm:col-span-2"
            disabled={busy}
            onClick={() => void onDecide("recusar")}
          >
            Recusar
          </Button>
        </div>
      ) : null}

      {apt.jogo_status === "confirmado" && apt.access_token ? (
        <Card>
          <CardTitle>Acesso do visitante</CardTitle>
          <p className="mt-2 break-all text-xs text-navy/55">
            {visitorAccessPath(apt.access_token)}
          </p>
          <p className="mt-2 text-sm text-navy/65">
            Token longo, expirável e revogável — só deste atendimento.
          </p>
        </Card>
      ) : null}

      {!isJogo || apt.jogo_status === "confirmado" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {apt.status === "SOLICITADO" && !isJogo ? (
            <Button onClick={() => updateAppointmentStatus(apt.id, "CONFIRMADO")}>
              Confirmar
            </Button>
          ) : null}
          {["CONFIRMADO", "SOLICITADO"].includes(apt.status) &&
          apt.jogo_status !== "aguardando_aprovacao" ? (
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

      {apt.started_at || apt.ended_at ? (
        <p className="text-center text-xs text-navy/45">
          Início {apt.started_at ? formatTime(apt.started_at) : "—"} · Fim{" "}
          {apt.ended_at ? formatTime(apt.ended_at) : "—"}
        </p>
      ) : null}
    </div>
  );
}
