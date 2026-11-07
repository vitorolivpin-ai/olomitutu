"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Home,
  Hourglass,
  Lock,
  MessageCircle,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { PublicBottomNav } from "@/components/hub/public-bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { CLIENT_WHATSAPP, openWhatsApp } from "@/lib/client-whatsapp";
import { formatCurrency, formatTime } from "@/lib/format";
import { saveGuestChatSession } from "@/lib/guest-chat-session";
import { buildPixCopyPaste, pixQrDataUrl } from "@/lib/pix";
import { buildSlotViews, type SlotView } from "@/lib/slots";
import { cn } from "@/lib/utils";

const DEFAULT_AMOUNT = 150;

type FlowStep = "selecao" | "ficha" | "pix" | "ok";

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayShort(isoOrKey: string) {
  const d = isoOrKey.includes("T") ? new Date(isoOrKey) : parseDayKey(isoOrKey);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(d)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

function monthShort(isoOrKey: string) {
  const d = isoOrKey.includes("T") ? new Date(isoOrKey) : parseDayKey(isoOrKey);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(d)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

function dayNum(isoOrKey: string) {
  const d = isoOrKey.includes("T") ? new Date(isoOrKey) : parseDayKey(isoOrKey);
  return String(d.getDate()).padStart(2, "0");
}

function parseDayKey(key: string) {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function longDateLabel(key: string) {
  const d = parseDayKey(key);
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Marcação pública — sem criar conta.
 * UI: dia → horário → resumo → ficha → Pix.
 */
export default function MarcarPublicoPage() {
  const { state, bookGuestAppointment } = useAppStore();
  const [step, setStep] = useState<FlowStep>("selecao");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [observation, setObservation] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [fichaCode, setFichaCode] = useState("");
  const [confirmedAt, setConfirmedAt] = useState("");
  const [guestClientId, setGuestClientId] = useState<string | null>(null);
  /** Evita mismatch SSR/cliente (Date.now nos slots). */
  const [hydrated, setHydrated] = useState(false);
  /** Página do seletor de dias (grupos de 5 no mobile / 7 no desktop). */
  const [dayPage, setDayPage] = useState(0);
  const [daysPerPage, setDaysPerPage] = useState(5);

  const amount = DEFAULT_AMOUNT;
  const house = state.houseSettings ?? {};

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDaysPerPage(mq.matches ? 7 : 5);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const livres = useMemo(() => {
    if (!hydrated) return [];
    return buildSlotViews(state.publishedSlots ?? [], state.appointments).filter(
      (v) => v.status === "livre",
    );
  }, [state.publishedSlots, state.appointments, hydrated]);

  const daysWithSlots = useMemo(() => {
    const map = new Map<string, SlotView[]>();
    for (const slot of livres) {
      const key = dayKey(slot.scheduled_at);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, slots]) => ({
        key,
        slots: slots.slice().sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
      }));
  }, [livres]);

  useEffect(() => {
    if (!selectedDay && daysWithSlots.length > 0) {
      setSelectedDay(daysWithSlots[0].key);
    }
    if (selectedDay && !daysWithSlots.some((d) => d.key === selectedDay)) {
      setSelectedDay(daysWithSlots[0]?.key ?? null);
      setSlotAt(null);
    }
  }, [daysWithSlots, selectedDay]);

  const dayPageCount = Math.max(1, Math.ceil(daysWithSlots.length / daysPerPage));

  useEffect(() => {
    setDayPage((p) => Math.min(p, Math.max(0, dayPageCount - 1)));
  }, [dayPageCount]);

  const visibleDays = useMemo(() => {
    const start = dayPage * daysPerPage;
    return daysWithSlots.slice(start, start + daysPerPage);
  }, [daysWithSlots, dayPage, daysPerPage]);

  const daySlots = useMemo(() => {
    if (!selectedDay) return [];
    return daysWithSlots.find((d) => d.key === selectedDay)?.slots ?? [];
  }, [daysWithSlots, selectedDay]);

  const selectedSlot = useMemo(
    () => (slotAt ? livres.find((s) => s.scheduled_at === slotAt) ?? null : null),
    [livres, slotAt],
  );

  const duration = selectedSlot?.duration_minutes ?? daySlots[0]?.duration_minutes ?? 60;

  useEffect(() => {
    if (slotAt && !livres.some((s) => s.scheduled_at === slotAt)) {
      setError("Este horário acabou de ser reservado. Escolha outro.");
      setSlotAt(null);
      if (step === "ficha" || step === "pix") setStep("selecao");
    }
  }, [livres, slotAt, step]);

  const visualStep = !selectedDay ? 1 : !slotAt ? 2 : 3;

  function pixPayload(scheduledAt: string) {
    if (!house.pix_key) return "";
    return buildPixCopyPaste({
      key: house.pix_key,
      holderName: house.pix_holder_name,
      amount,
      description: `Consulta ${scheduledAt.slice(0, 16)}`,
    });
  }

  function onContinue() {
    setError("");
    if (!selectedDay || !slotAt) {
      setError("Selecione o dia e o horário.");
      return;
    }
    if (!livres.some((s) => s.scheduled_at === slotAt)) {
      setError("Este horário não está mais disponível.");
      setSlotAt(null);
      return;
    }
    setStep("ficha");
  }

  function onFicha(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!slotAt) return;
    if (fullName.trim().length < 3) {
      setError("Informe seu nome completo.");
      return;
    }
    if (phone.trim().length < 8) {
      setError("Informe um telefone com DDD.");
      return;
    }
    setStep("pix");
  }

  async function copyPix() {
    if (!slotAt) return;
    const payload = pixPayload(slotAt);
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function confirmBook() {
    if (!slotAt) return;
    setError("");
    const result = bookGuestAppointment({
      scheduled_at: slotAt,
      amount,
      ficha: {
        full_name: fullName,
        phone,
        email: email || undefined,
        birth_date: birthDate || undefined,
        observation: observation || undefined,
      },
    });
    if (!result.ok) {
      setError(result.error);
      setStep("selecao");
      setSlotAt(null);
      return;
    }
    saveGuestChatSession({
      clientId: result.client_id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      fichaCode: result.ficha_code,
    });
    setGuestClientId(result.client_id);
    setFichaCode(result.ficha_code);
    setConfirmedAt(slotAt);
    setStep("ok");
  }

  function resetToLista() {
    setStep("selecao");
    setSlotAt(null);
    setFichaCode("");
    setGuestClientId(null);
    setFullName("");
    setPhone("");
    setEmail("");
    setBirthDate("");
    setObservation("");
    setError("");
  }

  const summaryCard = (
    <div className="rounded-[20px] bg-card p-5 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04]">
      <h2 className="font-display text-xl text-navy">Seu agendamento</h2>
      <ul className="mt-4 space-y-3">
        <SummaryRow
          icon={MessageCircle}
          label="Modalidade"
          value="Jogo pelo chat do app"
        />
        <SummaryRow
          icon={CalendarDays}
          label="Data"
          value={selectedDay ? longDateLabel(selectedDay) : "Escolha o dia"}
          muted={!selectedDay}
        />
        <SummaryRow
          icon={Clock}
          label="Horário"
          value={slotAt ? formatTime(slotAt) : "Escolha o horário"}
          muted={!slotAt}
        />
        <SummaryRow icon={Hourglass} label="Duração" value={`${duration} minutos`} />
        <SummaryRow icon={Wallet} label="Valor" value={formatCurrency(amount)} accent />
      </ul>

      {step === "selecao" ? (
        <>
          <Button
            type="button"
            variant="gold"
            className="mt-5 w-full text-base"
            disabled={!selectedDay || !slotAt}
            onClick={onContinue}
          >
            Continuar →
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-navy/45">
            <Lock className="h-3.5 w-3.5" />
            Seus dados estão seguros.
          </p>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background">
      <BrandWatermarks />
      <div className="relative z-10 mx-auto w-full max-w-[960px] px-4 py-6 pb-28 sm:px-6">
        <div className="mb-6">
          <BrandPageHeader
            title="Marcar horário"
            subtitle="Escolha o melhor dia e horário para seu atendimento."
            backHref="/"
            backLabel="Voltar ao início"
          />
          <span className="mt-3 inline-flex rounded-full bg-gold/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy">
            Aberto a todos
          </span>
        </div>

        {/* Stepper — só na seleção / confirmação visual */}
        {step === "selecao" || step === "ficha" || step === "pix" ? (
          <ol className="mb-6 flex items-start justify-center gap-2 sm:gap-4">
            <StepDot
              n={1}
              label="Escolha o dia"
              active={visualStep === 1}
              done={visualStep > 1 || step !== "selecao"}
            />
            <StepLine done={visualStep > 1 || step !== "selecao"} />
            <StepDot
              n={2}
              label="Escolha o horário"
              active={visualStep === 2 && step === "selecao"}
              done={visualStep > 2 || step !== "selecao"}
            />
            <StepLine done={visualStep > 2 || step !== "selecao"} />
            <StepDot
              n={3}
              label="Confira e finalize"
              active={visualStep === 3 || step === "ficha" || step === "pix"}
              done={false}
            />
          </ol>
        ) : null}

        {error ? (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        ) : null}

        {step === "ok" ? (
          <Card className="mx-auto max-w-md border-l-4 border-l-leaf text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-leaf" />
            <CardTitle className="mt-3 text-2xl">Horário reservado</CardTitle>
            <p className="mt-2 text-sm text-navy/70">
              {confirmedAt
                ? `${longDateLabel(dayKey(confirmedAt))} · ${formatTime(confirmedAt)}`
                : null}
            </p>
            <p className="mt-3 rounded-2xl bg-mist/70 px-3 py-2 text-sm text-navy/70">
              O jogo será feito pelo <strong className="text-navy">chat dentro do app</strong>{" "}
              com Vitor Cardozo - Ògún Yande, no horário marcado.
            </p>
            <p className="mt-4 font-display text-xl text-navy">{fichaCode}</p>
            <p className="mt-1 text-xs text-navy/50">
              Guarde este código. Os dados da ficha só o Pai de Santo vê.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link href="/marcar/chat">
                <Button variant="gold" className="w-full">
                  <MessageCircle className="h-4 w-4" />
                  Abrir o chat do jogo
                </Button>
              </Link>
              <Button variant="secondary" onClick={resetToLista}>
                Ver outros horários
              </Button>
            </div>
          </Card>
        ) : null}

        {step === "selecao" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
            <div className="space-y-6">
              {!hydrated ? (
                <p className="rounded-[20px] bg-card px-4 py-8 text-center text-sm text-navy/50 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04]">
                  Carregando horários…
                </p>
              ) : daysWithSlots.length === 0 ? (
                <div className="rounded-[20px] bg-card px-4 py-8 text-center shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04]">
                  <EmptyState title="Nenhum horário disponível no momento" />
                  <p className="mt-2 text-sm text-navy/50">
                    Volte mais tarde ou fale conosco pelo chat.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Dia ? pager (5 no mobile / 7 no desktop), sem corte lateral */}
                  <section className="w-full min-w-0">
                    <h2 className="font-display text-xl text-navy">Escolha o dia</h2>
                    <div className="mt-3 flex w-full min-w-0 items-stretch gap-1.5 sm:gap-2">
                      {dayPageCount > 1 ? (
                        <button
                          type="button"
                          aria-label="Datas anteriores"
                          disabled={dayPage <= 0}
                          onClick={() => setDayPage((p) => Math.max(0, p - 1))}
                          className={cn(
                            "flex h-auto w-9 shrink-0 items-center justify-center rounded-2xl transition sm:w-10",
                            dayPage <= 0
                              ? "pointer-events-none opacity-0"
                              : "bg-card text-navy shadow-[0_4px_14px_rgba(11,50,107,0.06)] ring-1 ring-navy/[0.06] hover:ring-gold/40",
                          )}
                        >
                          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                      ) : null}

                      <div
                        className="grid min-w-0 flex-1 gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(visibleDays.length, 1)}, minmax(0, 1fr))`,
                        }}
                      >
                        {visibleDays.map(({ key }) => {
                          const active = selectedDay === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setSelectedDay(key);
                                setSlotAt(null);
                                setError("");
                              }}
                              className={cn(
                                "flex min-w-0 w-full flex-col items-center rounded-2xl px-1 py-3 transition sm:px-2",
                                active
                                  ? "bg-navy text-white shadow-[0_6px_16px_rgba(11,31,58,0.2)] ring-2 ring-gold/70"
                                  : "bg-card text-navy shadow-[0_4px_14px_rgba(11,31,58,0.04)] ring-1 ring-navy/[0.04] hover:ring-gold/35",
                              )}
                            >
                              <span
                                className={cn(
                                  "text-[10px] font-semibold uppercase tracking-wide",
                                  active ? "text-gold" : "text-navy/45",
                                )}
                              >
                                {weekdayShort(key)}
                              </span>
                              <span className="mt-0.5 font-display text-2xl leading-none">
                                {dayNum(key)}
                              </span>
                              <span
                                className={cn(
                                  "mt-1 text-[10px] font-semibold uppercase",
                                  active ? "text-white/70" : "text-navy/40",
                                )}
                              >
                                {monthShort(key)}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {dayPageCount > 1 ? (
                        <button
                          type="button"
                          aria-label="Próximas datas"
                          disabled={dayPage >= dayPageCount - 1}
                          onClick={() =>
                            setDayPage((p) => Math.min(dayPageCount - 1, p + 1))
                          }
                          className={cn(
                            "flex h-auto w-9 shrink-0 items-center justify-center rounded-2xl transition sm:w-10",
                            dayPage >= dayPageCount - 1
                              ? "pointer-events-none opacity-0"
                              : "bg-card text-navy shadow-[0_4px_14px_rgba(11,50,107,0.06)] ring-1 ring-navy/[0.06] hover:ring-gold/40",
                          )}
                        >
                          <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                      ) : null}
                    </div>

                    {dayPageCount > 1 ? (
                      <div
                        className="mt-3 flex items-center justify-center gap-1.5"
                        aria-label={`Página ${dayPage + 1} de ${dayPageCount}`}
                      >
                        {Array.from({ length: dayPageCount }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Ir para o grupo de datas ${i + 1}`}
                            aria-current={i === dayPage ? "true" : undefined}
                            onClick={() => setDayPage(i)}
                            className={cn(
                              "h-1.5 rounded-full transition",
                              i === dayPage
                                ? "w-4 bg-navy"
                                : "w-1.5 bg-navy/25 hover:bg-navy/40",
                            )}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>

                  {/* 2. Horário ? grade 2 cols no mobile, 3?4 no desktop */}
                  <section className="w-full min-w-0">
                    <h2 className="font-display text-xl text-navy">Escolha o horário</h2>
                    {selectedDay ? (
                      <p className="mt-1 text-sm text-muted">
                        Horários disponíveis para {longDateLabel(selectedDay)}.
                      </p>
                    ) : null}
                    {daySlots.length === 0 ? (
                      <p className="mt-4 rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted ring-1 ring-navy/[0.04]">
                        Nenhum horário disponível para esta data. Escolha outro dia.
                      </p>
                    ) : (
                      <div className="mt-3 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                        {daySlots.map((slot) => {
                          const active = slotAt === slot.scheduled_at;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                setSlotAt(slot.scheduled_at);
                                setError("");
                              }}
                              className={cn(
                                "min-h-12 w-full rounded-2xl px-2 text-sm font-semibold transition",
                                active
                                  ? "bg-navy text-white shadow-[0_4px_12px_rgba(11,31,58,0.18)] ring-2 ring-gold/70"
                                  : "bg-card text-navy ring-1 ring-[#d9d0c0] hover:ring-gold/40",
                              )}
                            >
                              {formatTime(slot.scheduled_at)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {slotAt ? (
                      <div className="mt-4 space-y-2 rounded-2xl bg-card/90 px-4 py-3 text-sm text-navy/70 ring-1 ring-navy/[0.04]">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 font-medium text-navy">
                            <MessageCircle className="h-3.5 w-3.5 text-gold-deep" />
                            Jogo pelo chat do app
                          </span>
                          <span className="text-navy/25">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-gold-deep" />
                            {duration} minutos
                          </span>
                          <span className="text-navy/25">·</span>
                          <span className="font-display text-base text-gold-deep">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        <p className="text-xs text-navy/50">
                          No horário marcado, o jogo acontece na conversa dentro do aplicativo.
                        </p>
                      </div>
                    ) : null}
                  </section>
                </>
              )}

              {/* Chat discreto — mobile */}
              <div className="rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_14px_rgba(11,31,58,0.04)] ring-1 ring-navy/[0.04] lg:hidden">
                <p className="text-sm text-navy/60">
                  Tem alguma dúvida antes de marcar?
                </p>
                <Link
                  href="/marcar/chat"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:text-navy"
                >
                  <MessageCircle className="h-4 w-4" />
                  Conversar pelo chat →
                </Link>
              </div>

              {/* Resumo — mobile */}
              <div className="lg:hidden">{summaryCard}</div>
            </div>

            {/* Coluna direita — desktop */}
            <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
              {summaryCard}
              <div className="rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_14px_rgba(11,31,58,0.04)] ring-1 ring-navy/[0.04]">
                <p className="text-sm text-navy/60">
                  Tem alguma dúvida antes de marcar?
                </p>
                <Link
                  href="/marcar/chat"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:text-navy"
                >
                  <MessageCircle className="h-4 w-4" />
                  Conversar pelo chat →
                </Link>
              </div>
              <HelpFooter />
            </aside>
          </div>
        ) : null}

        {step === "ficha" && slotAt ? (
          <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
            <Card>
              <button
                type="button"
                className="text-sm text-navy/55"
                onClick={() => setStep("selecao")}
              >
                ← Voltar
              </button>
              <CardTitle className="mt-2">Sua ficha</CardTitle>
              <p className="mt-1 text-sm text-navy/60">
                {longDateLabel(dayKey(slotAt))} · {formatTime(slotAt)} · jogo pelo chat · só
                o Pai de Santo verá estes dados
              </p>
              <form onSubmit={onFicha} className="mt-4 space-y-3">
                <div>
                  <Label>Nome completo</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <Label>E-mail (opcional)</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label>Data de nascimento (opcional)</Label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Observação (opcional)</Label>
                  <Textarea
                    rows={3}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="O que deseja tratar, preferências…"
                  />
                </div>
                <Button type="submit" variant="gold" className="w-full">
                  Continuar para o Pix →
                </Button>
              </form>
            </Card>
            <div className="hidden lg:block">{summaryCard}</div>
          </div>
        ) : null}

        {step === "pix" && slotAt ? (
          <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
            <Card className="border-l-4 border-l-gold">
              <button
                type="button"
                className="text-sm text-navy/55"
                onClick={() => setStep("ficha")}
              >
                ← Voltar
              </button>
              <CardTitle className="mt-2">Pagamento via PIX</CardTitle>
              <p className="mt-2 text-sm text-navy/70">
                {longDateLabel(dayKey(slotAt))} · {formatTime(slotAt)} ·{" "}
                {formatCurrency(amount)}
              </p>

              {house.pix_key ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-navy/50">
                    {house.pix_holder_name || "Beneficiário da casa"}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pixQrDataUrl(pixPayload(slotAt), "Consulta")}
                    alt="QR Pix"
                    className="mx-auto h-44 w-44 rounded-xl border border-navy/10 bg-card p-2"
                  />
                  <p className="text-center font-display text-2xl text-gold-deep">
                    {formatCurrency(amount)}
                  </p>
                  <Button variant="secondary" className="w-full" onClick={() => void copyPix()}>
                    <Copy className="h-4 w-4" />
                    {copied ? "Copiado" : "Copiar chave PIX"}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-amber-900">
                  Chave Pix ainda não cadastrada. Use o chat com Vitor Cardozo - Ògún Yande.
                </p>
              )}

              <Button variant="gold" className="mt-4 w-full" onClick={confirmBook}>
                Já paguei — confirmar marcação
              </Button>
              <Link
                href="/marcar/chat"
                className="mt-3 block text-center text-sm font-medium text-gold-deep"
              >
                Preferir falar no chat antes →
              </Link>
            </Card>
            <div className="hidden lg:block">{summaryCard}</div>
          </div>
        ) : null}

        {/* Rodapé — mobile / etapas */}
        {step !== "ok" ? (
          <div className="mt-8 lg:hidden">
            <HelpFooter />
          </div>
        ) : (
          <div className="mt-8">
            <HelpFooter />
          </div>
        )}

        {guestClientId && step === "ok" ? null : guestClientId ? (
          <p className="mt-4 text-center text-xs text-navy/45">
            <Link href="/marcar/chat" className="underline">
              Abrir chat
            </Link>
          </p>
        ) : null}
      </div>
      <PublicBottomNav />
    </div>
  );
}

function StepDot({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex w-[5.5rem] flex-col items-center gap-1.5 sm:w-28">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
          active || done
            ? "bg-navy text-white"
            : "bg-card text-navy/40 ring-1 ring-navy/10",
          active && "ring-2 ring-gold/60",
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          "text-center text-[10px] leading-tight sm:text-[11px]",
          active ? "font-semibold text-navy" : "text-navy/40",
        )}
      >
        {label}
      </span>
    </li>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <li
      aria-hidden
      className={cn(
        "mt-4 h-px w-4 shrink-0 sm:w-8",
        done ? "bg-navy/40" : "bg-navy/15",
      )}
    />
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  muted,
  accent,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mist text-gold-deep">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">
          {label}
        </p>
        <p
          className={cn(
            "text-sm font-medium",
            muted && "text-navy/35",
            accent && "font-display text-lg text-gold-deep",
            !muted && !accent && "text-navy",
          )}
        >
          {value}
        </p>
      </div>
    </li>
  );
}

function HelpFooter() {
  return (
    <div className="rounded-[18px] bg-card/90 px-4 py-4 text-center ring-1 ring-navy/[0.04]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/40">
        Precisa de ajuda?
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-medium text-navy/70 transition hover:text-navy"
          onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
        >
          <Phone className="h-3.5 w-3.5 text-gold-deep" />
          WhatsApp
        </button>
        <span className="text-navy/20">|</span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-medium text-navy/70 transition hover:text-navy"
          onClick={() => openWhatsApp(CLIENT_WHATSAPP.grupo.href)}
        >
          <Users className="h-3.5 w-3.5 text-gold-deep" />
          Grupo
        </button>
        <span className="text-navy/20">|</span>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-medium text-navy/70 transition hover:text-navy"
        >
          <Home className="h-3.5 w-3.5 text-gold-deep" />
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
