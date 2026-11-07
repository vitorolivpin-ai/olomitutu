"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  MessageCircle,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { PaiModulesSheet } from "@/components/house/pai-modules-sheet";
import { Badge, feeStatusTone } from "@/components/ui/badge";
import { useAppStore } from "@/hooks/use-app-store";
import { appointmentPublicLabel } from "@/lib/appointment-ficha";
import { dashboardMetrics } from "@/lib/finance";
import {
  currentCompetence,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  signedCurrency,
} from "@/lib/format";
import { unreadChatCountForRole } from "@/lib/notifications";
import { roleLabel } from "@/lib/permissions";
import { buildSlotViews } from "@/lib/slots";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function endOfDay(d: Date) {
  return startOfDay(d) + 24 * 60 * 60 * 1000 - 1;
}

function endOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const end = new Date(d);
  end.setDate(d.getDate() + diff);
  return endOfDay(end);
}

function isActiveApt(status: Appointment["status"]) {
  return !["CANCELADO", "NAO_COMPARECEU"].includes(status);
}

function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const today = startOfDay(now);
  const target = startOfDay(d);
  const tomorrow = today + 24 * 60 * 60 * 1000;
  if (target === today) return "Hoje";
  if (target === tomorrow) return "Amanhã";
  return formatDate(iso);
}

function statusLabel(status: Appointment["status"]) {
  const map: Record<Appointment["status"], string> = {
    SOLICITADO: "Aguardando",
    CONFIRMADO: "Confirmado",
    EM_ATENDIMENTO: "Em atendimento",
    REALIZADO: "Realizado",
    CANCELADO: "Cancelado",
    NAO_COMPARECEU: "Não compareceu",
  };
  return map[status] ?? status;
}

/**
 * Home operacional do Pai de Santo — agenda primeiro, módulos depois.
 */
export function PaiHome() {
  const { state, currentUser } = useAppStore();
  const [clientQuery, setClientQuery] = useState("");
  const [modulesOpen, setModulesOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);
  const competence = currentCompetence(now);
  const metrics = dashboardMetrics(state, competence);
  const pendingFinance = Math.max(0, metrics.expected - metrics.received);

  const chatUnread = unreadChatCountForRole(state.notifications ?? [], currentUser?.role, {
    clientId: currentUser?.client_id,
  });

  const appointments = useMemo(
    () =>
      (state.appointments ?? [])
        .filter((a) => isActiveApt(a.status))
        .slice()
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [state.appointments],
  );

  const todayApts = useMemo(
    () =>
      appointments.filter((a) => {
        const t = new Date(a.scheduled_at).getTime();
        return t >= todayStart && t <= todayEnd;
      }),
    [appointments, todayStart, todayEnd],
  );

  const upcomingGames = useMemo(
    () =>
      appointments
        .filter((a) => new Date(a.scheduled_at).getTime() >= now.getTime() - 30 * 60 * 1000)
        .slice(0, 5),
    [appointments, now],
  );

  const freeSlots = useMemo(
    () =>
      buildSlotViews(state.publishedSlots ?? [], state.appointments ?? []).filter(
        (s) => s.status === "livre",
      ),
    [state.publishedSlots, state.appointments],
  );

  const freeToday = freeSlots.filter((s) => {
    const t = new Date(s.scheduled_at).getTime();
    return t >= todayStart && t <= todayEnd;
  }).length;

  const freeWeek = freeSlots.filter((s) => {
    const t = new Date(s.scheduled_at).getTime();
    return t >= todayStart && t <= weekEnd;
  }).length;

  const todayPreview = todayApts.slice(0, 5);

  const clientsForHome = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const upcomingIds = new Set(
      upcomingGames.map((a) => a.client_id).filter(Boolean),
    );
    const scored = (state.clients ?? []).map((c) => {
      const related = appointments.filter((a) => a.client_id === c.id);
      const past = related
        .filter((a) => new Date(a.scheduled_at).getTime() < now.getTime())
        .slice()
        .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];
      const next = related
        .filter((a) => new Date(a.scheduled_at).getTime() >= now.getTime())
        .slice()
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
      const boost = upcomingIds.has(c.id) ? 2 : next ? 1 : 0;
      return { client: c, past, next, boost };
    });

    return scored
      .filter(({ client }) => {
        if (!q) return true;
        return (
          client.full_name.toLowerCase().includes(q) ||
          (client.phone ?? "").includes(q) ||
          (client.email ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (b.boost !== a.boost) return b.boost - a.boost;
        const an = a.next?.scheduled_at ?? "";
        const bn = b.next?.scheduled_at ?? "";
        if (an && bn) return an.localeCompare(bn);
        if (an) return -1;
        if (bn) return 1;
        return a.client.full_name.localeCompare(b.client.full_name);
      })
      .slice(0, q ? 8 : 5);
  }, [state.clients, appointments, upcomingGames, clientQuery, now]);

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div className="animate-rise mx-auto max-w-6xl space-y-6 pb-4">
      {/* Cabeçalho compacto */}
      <header className="flex items-center gap-3">
        <BrandMark className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" priority />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/45">
            {currentUser?.role ? roleLabel(currentUser.role) : "App da Casa"}
          </p>
          <h1 className="font-display text-2xl leading-tight text-navy sm:text-[1.75rem]">
            Agenda e atendimentos
          </h1>
          <p className="mt-0.5 text-xs capitalize text-navy/45">{dateLabel}</p>
        </div>
      </header>

      <EnablePushBanner compact />

      {/* Agenda | Próximos jogos */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
        <section className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-navy">Agenda de hoje</h2>
              <p className="mt-1 text-sm text-navy/55">
                <span className="font-semibold text-navy">{todayApts.length}</span>{" "}
                {todayApts.length === 1 ? "atendimento" : "atendimentos"} hoje
                <span className="mx-1.5 text-navy/25">·</span>
                <span className="font-semibold text-navy">{freeToday}</span>{" "}
                {freeToday === 1 ? "horário disponível" : "horários disponíveis"}
              </p>
            </div>
            <Link
              href="/agenda"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-[0_4px_12px_rgba(201,162,39,0.25)] transition hover:bg-gold-soft"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              Novo agendamento
            </Link>
          </div>

          <ul className="mt-4 space-y-0">
            {todayPreview.length === 0 ? (
              <li className="rounded-2xl bg-[#F7F8FA] px-4 py-6 text-center text-sm text-navy/50">
                Nenhum atendimento marcado para hoje.
              </li>
            ) : (
              todayPreview.map((apt, idx) => {
                const client = state.clients.find((c) => c.id === apt.client_id);
                const name = appointmentPublicLabel(apt, client?.full_name, currentUser);
                return (
                  <li
                    key={apt.id}
                    className={cn(
                      "flex gap-3 py-3",
                      idx < todayPreview.length - 1 && "border-b border-navy/[0.06]",
                    )}
                  >
                    <div className="w-14 shrink-0 pt-0.5">
                      <p className="font-display text-lg leading-none text-navy">
                        {formatTime(apt.scheduled_at)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-navy/40">
                        Jogo · chat
                      </p>
                      <p className="truncate font-medium text-navy">{name}</p>
                    </div>
                    <Badge tone={feeStatusTone(apt.status)} className="shrink-0 self-start">
                      {statusLabel(apt.status)}
                    </Badge>
                  </li>
                );
              })
            )}
          </ul>

          <Link
            href="/agenda"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep transition hover:text-navy"
          >
            Ver agenda completa
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04] sm:p-5">
          <h2 className="font-display text-xl text-navy">Próximos jogos</h2>
          <ul className="mt-3 space-y-0">
            {upcomingGames.length === 0 ? (
              <li className="rounded-2xl bg-[#F7F8FA] px-4 py-6 text-center text-sm text-navy/50">
                Nenhum jogo à frente.
              </li>
            ) : (
              upcomingGames.map((apt, idx) => {
                const client = state.clients.find((c) => c.id === apt.client_id);
                const name = appointmentPublicLabel(apt, client?.full_name, currentUser);
                return (
                  <li
                    key={apt.id}
                    className={cn(
                      "py-3",
                      idx < upcomingGames.length - 1 && "border-b border-navy/[0.06]",
                    )}
                  >
                    <p className="text-xs font-medium text-navy/45">
                      {dayLabel(apt.scheduled_at, now)} · {formatTime(apt.scheduled_at)}
                    </p>
                    <div className="mt-0.5 flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-medium text-navy">{name}</p>
                      <Badge tone={feeStatusTone(apt.status)} className="shrink-0">
                        {statusLabel(apt.status)}
                      </Badge>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <Link
            href="/agenda"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep transition hover:text-navy"
          >
            Ver todos os jogos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      {/* Ações rápidas */}
      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/40">
          Ações rápidas
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickAction href="/agenda" icon={Plus} label="+ Novo jogo" gold />
          <QuickAction href="/clientes?novo=1" icon={UserPlus} label="+ Novo cliente" />
          <QuickAction
            href="/disponibilidade"
            icon={CalendarClock}
            label="Disponibilizar horário"
          />
          <QuickAction
            href="/conversas"
            icon={MessageCircle}
            label="Conversas"
            badge={chatUnread > 0 ? chatUnread : undefined}
          />
        </div>
      </section>

      {/* Clientes */}
      <section className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04] sm:p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gold-deep" />
          <h2 className="font-display text-lg text-navy">Clientes de jogo</h2>
        </div>
        <label className="relative mt-3 block">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/35" />
          <input
            type="search"
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full rounded-2xl border border-navy/10 bg-[#F7F8FA] py-2.5 pl-10 pr-3 text-sm text-navy outline-none ring-gold placeholder:text-navy/35 focus:ring-2"
          />
        </label>
        <ul className="mt-3 space-y-0">
          {clientsForHome.length === 0 ? (
            <li className="py-4 text-center text-sm text-navy/45">Nenhum cliente encontrado.</li>
          ) : (
            clientsForHome.map(({ client, past, next }, idx) => (
              <li
                key={client.id}
                className={cn(
                  "flex items-center gap-3 py-3",
                  idx < clientsForHome.length - 1 && "border-b border-navy/[0.06]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy">{client.full_name}</p>
                  <p className="text-xs text-navy/45">
                    Último jogo: {past ? formatDate(past.scheduled_at) : "—"}
                    {next ? (
                      <>
                        <span className="mx-1 text-navy/25">·</span>
                        Próximo: {formatDateTime(next.scheduled_at)}
                      </>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={`/clientes/${client.id}`}
                  className="shrink-0 text-sm font-semibold text-gold-deep hover:text-navy"
                >
                  Ver ficha →
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Horários + Conversas */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04]">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold-deep" />
            <h2 className="font-display text-lg text-navy">Horários</h2>
          </div>
          <p className="mt-2 text-sm text-navy/65">
            <span className="font-semibold text-navy">{freeToday}</span> disponíveis hoje
            <span className="mx-1.5 text-navy/25">·</span>
            <span className="font-semibold text-navy">{freeWeek}</span> nesta semana
          </p>
          <Link
            href="/disponibilidade"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:text-navy"
          >
            Gerenciar horários
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04]">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-gold-deep" />
            <h2 className="font-display text-lg text-navy">Conversas</h2>
          </div>
          <p className="mt-2 text-sm text-navy/65">
            {chatUnread > 0 ? (
              <>
                <span className="font-semibold text-navy">{chatUnread}</span>{" "}
                {chatUnread === 1 ? "nova" : "novas"}
              </>
            ) : (
              "Nenhuma conversa nova"
            )}
          </p>
          <Link
            href="/conversas"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:text-navy"
          >
            Abrir conversas
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Financeiro compacto */}
      <section className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04] sm:p-5">
        <h2 className="font-display text-lg text-navy">Financeiro do mês</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">
              Recebido
            </p>
            <p className="mt-0.5 font-display text-lg text-navy">
              {formatCurrency(metrics.received)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">
              Pendente
            </p>
            <p className="mt-0.5 font-display text-lg text-navy">
              {formatCurrency(pendingFinance)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">
              Saldo
            </p>
            <p className="mt-0.5 font-display text-lg text-navy">
              {signedCurrency(metrics.balance)}
            </p>
          </div>
        </div>
        <Link
          href="/financeiro"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:text-navy"
        >
          Ver financeiro
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Todos os módulos */}
      <section className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04] sm:p-5">
        <h2 className="font-display text-lg text-navy">Todos os módulos</h2>
        <p className="mt-1 text-sm text-navy/50">
          Acesso completo — atendimento, gestão, financeiro, loja e casa.
        </p>
        <button
          type="button"
          onClick={() => setModulesOpen(true)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:text-navy"
        >
          Ver todos os módulos
          <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      <PaiModulesSheet
        open={modulesOpen}
        onClose={() => setModulesOpen(false)}
        role={currentUser?.role}
      />
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  gold,
  badge,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  gold?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-h-[4.25rem] flex-col items-start justify-center gap-1 rounded-[16px] px-3 py-2.5 text-left text-sm font-semibold transition",
        gold
          ? "bg-gold text-navy shadow-[0_4px_12px_rgba(201,162,39,0.22)] hover:bg-gold-soft"
          : "bg-white text-navy shadow-[0_4px_14px_rgba(11,31,58,0.04)] ring-1 ring-navy/[0.04] hover:ring-gold/30",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} />
      <span className="leading-snug">{label}</span>
      {badge ? (
        <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
