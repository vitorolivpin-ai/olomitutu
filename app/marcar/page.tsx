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
  Monitor,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { PublicBottomNav } from "@/components/hub/public-bottom-nav";
import { EnableJogoPush } from "@/components/jogo/enable-jogo-push";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { CLIENT_WHATSAPP, openWhatsApp } from "@/lib/client-whatsapp";
import { formatCurrency, formatTime } from "@/lib/format";
import {
  clearGuestJogoSession,
  loadGuestJogoSession,
  saveGuestJogoSession,
  type GuestJogoSession,
} from "@/lib/guest-jogo-session";
import {
  DEFAULT_JOGO_AMOUNT,
  isJogoRemoteEnabled,
  modalidadeLabel,
  readFileAsDataUrl,
  validateJogoProofFile,
  visitorAccessPath,
} from "@/lib/jogo";
import { buildPixCopyPaste, pixQrDataUrl } from "@/lib/pix";
import { buildSlotViews, type SlotView } from "@/lib/slots";
import { cn } from "@/lib/utils";
import type { JogoModalidade } from "@/types";

type FlowStep =
  | "aviso"
  | "modalidade"
  | "selecao"
  | "ficha"
  | "pix"
  | "comprovante"
  | "status";

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
 * Marcação pública de Jogo — sem criar conta.
 * Etapas: aviso → modalidade → data/hora (hold) → ficha → Pix → comprovante → status.
 */
export default function MarcarPublicoPage() {
  const {
    state,
    holdGuestJogo,
    completeGuestJogoFicha,
    attachGuestJogoProof,
    refreshJogoDeadlines,
  } = useAppStore();

  const [step, setStep] = useState<FlowStep>("aviso");
  const [modalidade, setModalidade] = useState<JogoModalidade | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [observation, setObservation] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<GuestJogoSession | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dayPage, setDayPage] = useState(0);
  const [daysPerPage, setDaysPerPage] = useState(5);

  const amount = state.houseSettings?.jogo_amount ?? DEFAULT_JOGO_AMOUNT;
  const house = state.houseSettings ?? {};

  useEffect(() => {
    setHydrated(true);
    refreshJogoDeadlines();
    const saved = loadGuestJogoSession();
    if (saved) {
      setSession(saved);
      setModalidade(saved.modalidade);
      setSlotAt(saved.scheduledAt);
      setSelectedDay(dayKey(saved.scheduledAt));
      setFullName(saved.fullName);
      setPhone(saved.phone);
      setEmail(saved.email);
      if (
        saved.jogoStatus === "aguardando_aprovacao" ||
        saved.jogoStatus === "prazo_analise_atingido" ||
        saved.jogoStatus === "confirmado" ||
        saved.jogoStatus === "recusado"
      ) {
        setStep("status");
      }
    }
  }, [refreshJogoDeadlines]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDaysPerPage(mq.matches ? 7 : 5);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const livres = useMemo(() => {
    if (!hydrated) return [];
    return buildSlotViews(
      state.publishedSlots ?? [],
      state.appointments,
      state.jogoSlotHolds,
    ).filter((v) => v.status === "livre");
  }, [state.publishedSlots, state.appointments, state.jogoSlotHolds, hydrated]);

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
    if (!selectedDay && daysWithSlots.length > 0) setSelectedDay(daysWithSlots[0].key);
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

  function pixPayload(scheduledAt: string) {
    if (!house.pix_key) return "";
    return buildPixCopyPaste({
      key: house.pix_key,
      holderName: house.pix_holder_name,
      amount,
      description: `Jogo ${scheduledAt.slice(0, 16)}`,
    });
  }

  async function notifyEmail(payload: {
    to: string;
    event: "confirmado" | "recusado" | "novo_comprovante" | "comprovante_recebido";
    scheduled_at: string;
    modalidade: JogoModalidade;
    access_token?: string;
    ficha_code?: string;
  }) {
    try {
      await fetch("/api/email/jogo-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // E-mail é best-effort; o fluxo do app continua.
    }
  }

  async function onHoldSlot() {
    setError("");
    if (!modalidade) {
      setError("Escolha a modalidade do Jogo.");
      return;
    }
    if (!selectedDay || !slotAt) {
      setError("Selecione o dia e o horário.");
      return;
    }
    if (!livres.some((s) => s.scheduled_at === slotAt)) {
      setError("Este horário não está mais disponível.");
      setSlotAt(null);
      return;
    }
    setUploading(true);
    try {
      const held = await holdGuestJogo({
        scheduled_at: slotAt,
        modalidade,
        amount,
      });
      if (!held.ok) {
        setError(held.error);
        setSlotAt(null);
        return;
      }
      const next: GuestJogoSession = {
        appointmentId: held.appointment.id,
        clientId: held.client_id,
        fullName: "",
        phone: "",
        email: "",
        fichaCode: held.ficha_code,
        scheduledAt: slotAt,
        modalidade,
        amount,
        jogoStatus: "aguardando_pagamento",
        holdExpiresAt: held.hold_expires_at,
        guestSecret: held.guest_secret,
      };
      saveGuestJogoSession(next);
      setSession(next);
      setStep("ficha");
    } finally {
      setUploading(false);
    }
  }

  async function onFicha(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!session) {
      setError("Reserva não encontrada. Escolha o horário novamente.");
      setStep("selecao");
      return;
    }
    setUploading(true);
    try {
      const result = await completeGuestJogoFicha({
        appointment_id: session.appointmentId,
        guest_secret: session.guestSecret,
        ficha: {
          full_name: fullName,
          phone,
          email,
          birth_date: birthDate,
          observation: observation || undefined,
          privacy_accepted: privacyAccepted,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const next = {
        ...session,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };
      saveGuestJogoSession(next);
      setSession(next);
      setStep("pix");
    } finally {
      setUploading(false);
    }
  }

  async function copyPix() {
    if (!slotAt && !session?.scheduledAt) return;
    const at = slotAt ?? session!.scheduledAt;
    const payload = pixPayload(at);
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onUploadProof(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!session) return;
    if (!proofFile) {
      setError("Selecione o comprovante (JPG, PNG ou PDF).");
      return;
    }
    const valid = validateJogoProofFile(proofFile);
    if (!valid.ok) {
      setError(valid.error);
      return;
    }
    setUploading(true);
    try {
      const dataUrl = isJogoRemoteEnabled()
        ? undefined
        : await readFileAsDataUrl(proofFile);
      const result = await attachGuestJogoProof({
        appointment_id: session.appointmentId,
        guest_secret: session.guestSecret,
        file: proofFile,
        proof: {
          file_name: proofFile.name,
          mime_type: proofFile.type,
          size_bytes: proofFile.size,
          // Demo local: data_url privado. Remoto: API grava no bucket (sem data_url).
          data_url: dataUrl,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const next: GuestJogoSession = {
        ...session,
        jogoStatus: "aguardando_aprovacao",
      };
      saveGuestJogoSession(next);
      setSession(next);
      void notifyEmail({
        to: session.email,
        event: "comprovante_recebido",
        scheduled_at: session.scheduledAt,
        modalidade: session.modalidade,
        ficha_code: session.fichaCode,
      });
      setStep("status");
    } catch {
      setError("Falha ao ler o arquivo. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function resetFlow() {
    clearGuestJogoSession();
    setSession(null);
    setStep("aviso");
    setModalidade(null);
    setSlotAt(null);
    setFullName("");
    setPhone("");
    setEmail("");
    setBirthDate("");
    setObservation("");
    setPrivacyAccepted(false);
    setProofFile(null);
    setError("");
  }

  const summaryCard = (
    <div className="rounded-[20px] bg-card p-5 shadow-[0_6px_20px_rgba(11,31,58,0.05)] ring-1 ring-navy/[0.04]">
      <h2 className="font-display text-xl text-navy">Seu Jogo</h2>
      <ul className="mt-4 space-y-3">
        <SummaryRow
          icon={Monitor}
          label="Modalidade"
          value={modalidade ? modalidadeLabel(modalidade) : "Escolha"}
          muted={!modalidade}
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
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-navy/45">
        <Lock className="h-3.5 w-3.5" />
        Horário reservado só após escolha · confirmação em até 24h
      </p>
    </div>
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background">
      <BrandWatermarks />
      <div className="relative z-10 mx-auto w-full max-w-[960px] px-4 py-6 pb-28 sm:px-6">
        <div className="mb-6">
          <BrandPageHeader
            title="Marcar um Jogo"
            subtitle="Escolha modalidade, dia e horário — sem criar conta."
            backHref="/"
            backLabel="Voltar ao início"
          />
          <span className="mt-3 inline-flex rounded-full bg-gold/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy">
            Aberto a todos
          </span>
        </div>

        {error ? (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        ) : null}

        {step === "aviso" ? (
          <Card className="mx-auto max-w-xl border-l-4 border-l-gold">
            <CardTitle>Antes de continuar</CardTitle>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-navy/75">
              <p>
                Após realizar o pagamento e enviar o comprovante, sua solicitação será
                encaminhada ao Pai de Santo para análise.
              </p>
              <p>
                A confirmação do Jogo pode levar até <strong>24 horas</strong>.
              </p>
              <p>
                Você receberá a resposta no <strong>e-mail informado</strong> durante a
                marcação.
              </p>
              <p className="rounded-2xl bg-mist/80 px-3 py-2 text-xs text-navy/60">
                O horário escolhido ainda não está confirmado até a aprovação do Pai de Santo.
              </p>
            </div>
            <Button
              type="button"
              variant="gold"
              className="mt-5 w-full min-h-11"
              onClick={() => setStep("modalidade")}
            >
              Entendi, continuar →
            </Button>
          </Card>
        ) : null}

        {step === "modalidade" ? (
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setModalidade("online");
                setError("");
              }}
              className={cn(
                "min-h-[9rem] rounded-[20px] bg-card p-5 text-left shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 transition",
                modalidade === "online"
                  ? "ring-2 ring-gold/70"
                  : "ring-navy/[0.04] hover:ring-gold/40",
              )}
            >
              <Monitor className="h-6 w-6 text-gold-deep" />
              <p className="mt-3 font-display text-xl text-navy">Jogo Online</p>
              <p className="mt-2 text-sm text-navy/60">
                O atendimento será realizado pelo próprio ILÉ.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setModalidade("presencial");
                setError("");
              }}
              className={cn(
                "min-h-[9rem] rounded-[20px] bg-card p-5 text-left shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 transition",
                modalidade === "presencial"
                  ? "ring-2 ring-gold/70"
                  : "ring-navy/[0.04] hover:ring-gold/40",
              )}
            >
              <Users className="h-6 w-6 text-gold-deep" />
              <p className="mt-3 font-display text-xl text-navy">Jogo Presencial</p>
              <p className="mt-2 text-sm text-navy/60">
                Atendimento na casa, no horário combinado.
              </p>
            </button>
            {modalidade === "online" ? (
              <p className="sm:col-span-2 rounded-2xl bg-mist/80 px-4 py-3 text-sm text-navy/65">
                Voz e vídeo serão liberados em etapa posterior. Por enquanto, o modelo já
                registra a modalidade Online. Não abrimos Skype, Teams ou WhatsApp externos.
              </p>
            ) : null}
            <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => setStep("aviso")}>
                ← Voltar
              </Button>
              <Button
                type="button"
                variant="gold"
                className="min-h-11 flex-1"
                disabled={!modalidade}
                onClick={() => setStep("selecao")}
              >
                Continuar →
              </Button>
            </div>
          </div>
        ) : null}

        {step === "selecao" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
            <div className="space-y-6">
              {!hydrated ? (
                <p className="rounded-[20px] bg-card px-4 py-8 text-center text-sm text-navy/50">
                  Carregando horários…
                </p>
              ) : daysWithSlots.length === 0 ? (
                <div className="rounded-[20px] bg-card px-4 py-8 text-center">
                  <EmptyState title="Nenhum horário disponível no momento" />
                </div>
              ) : (
                <>
                  <section className="w-full min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-xl text-navy">Escolha o dia</h2>
                      <button
                        type="button"
                        className="text-sm text-navy/55"
                        onClick={() => setStep("modalidade")}
                      >
                        ← Modalidade
                      </button>
                    </div>
                    <div className="mt-3 flex w-full min-w-0 items-stretch gap-1.5 sm:gap-2">
                      {dayPageCount > 1 ? (
                        <button
                          type="button"
                          aria-label="Datas anteriores"
                          disabled={dayPage <= 0}
                          onClick={() => setDayPage((p) => Math.max(0, p - 1))}
                          className={cn(
                            "flex min-h-11 w-9 shrink-0 items-center justify-center rounded-2xl transition sm:w-10",
                            dayPage <= 0
                              ? "pointer-events-none opacity-0"
                              : "bg-card text-navy ring-1 ring-navy/[0.06]",
                          )}
                        >
                          <ChevronLeft className="h-5 w-5" />
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
                                "min-h-[4.5rem] rounded-2xl px-1 py-2 text-center transition",
                                active
                                  ? "bg-navy text-white ring-2 ring-gold/70"
                                  : "bg-card text-navy ring-1 ring-[#d9d0c0]",
                              )}
                            >
                              <p className="text-[10px] font-semibold opacity-70">
                                {weekdayShort(key)}
                              </p>
                              <p className="font-display text-xl leading-none">{dayNum(key)}</p>
                              <p className="text-[10px] font-semibold opacity-70">
                                {monthShort(key)}
                              </p>
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
                            "flex min-h-11 w-9 shrink-0 items-center justify-center rounded-2xl transition sm:w-10",
                            dayPage >= dayPageCount - 1
                              ? "pointer-events-none opacity-0"
                              : "bg-card text-navy ring-1 ring-navy/[0.06]",
                          )}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      ) : null}
                    </div>
                  </section>

                  <section>
                    <h2 className="font-display text-xl text-navy">Escolha o horário</h2>
                    <p className="mt-1 text-xs text-navy/50">
                      Mostramos apenas horários livres — sem nomes de outras pessoas.
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                                ? "bg-navy text-white ring-2 ring-gold/70"
                                : "bg-card text-navy ring-1 ring-[#d9d0c0]",
                            )}
                          >
                            {formatTime(slot.scheduled_at)}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="gold"
                      className="mt-5 w-full min-h-11 lg:hidden"
                      disabled={!selectedDay || !slotAt}
                      onClick={onHoldSlot}
                    >
                      Reservar horário e continuar →
                    </Button>
                  </section>
                </>
              )}
              <div className="lg:hidden">{summaryCard}</div>
            </div>
            <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
              {summaryCard}
              <Button
                type="button"
                variant="gold"
                className="w-full min-h-11"
                disabled={!selectedDay || !slotAt}
                onClick={onHoldSlot}
              >
                Reservar horário e continuar →
              </Button>
              <HelpFooter />
            </aside>
          </div>
        ) : null}

        {step === "ficha" && session ? (
          <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
            <Card>
              <button
                type="button"
                className="min-h-11 text-sm text-navy/55"
                onClick={() => setStep("selecao")}
              >
                ← Voltar
              </button>
              <CardTitle className="mt-2">Seus dados</CardTitle>
              <p className="mt-1 text-sm text-navy/60">
                {longDateLabel(dayKey(session.scheduledAt))} ·{" "}
                {formatTime(session.scheduledAt)} · {modalidadeLabel(session.modalidade)}
              </p>
              <p className="mt-2 text-xs text-navy/45">
                Reserva temporária · ainda não confirmada · só o Pai de Santo vê estes dados
              </p>
              <form onSubmit={onFicha} className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="jogo-nome">Nome completo</Label>
                  <Input
                    id="jogo-nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="jogo-nasc">Data de nascimento</Label>
                  <Input
                    id="jogo-nasc"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="jogo-email">E-mail</Label>
                  <Input
                    id="jogo-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="jogo-whats">WhatsApp</Label>
                  <Input
                    id="jogo-whats"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <Label htmlFor="jogo-obs">Observação curta (opcional)</Label>
                  <Textarea
                    id="jogo-obs"
                    rows={2}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Preferências de horário ou acesso — sem conteúdo sensível"
                  />
                </div>
                <label className="flex items-start gap-3 rounded-2xl bg-mist/70 px-3 py-3 text-sm text-navy/75">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    required
                  />
                  <span>
                    Li e aceito a Política de Privacidade do ILÉ para esta marcação.
                  </span>
                </label>
                <Button type="submit" variant="gold" className="w-full min-h-11">
                  Continuar para o pagamento →
                </Button>
              </form>
            </Card>
            <div className="hidden lg:block">{summaryCard}</div>
          </div>
        ) : null}

        {step === "pix" && session ? (
          <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
            <Card className="border-l-4 border-l-gold">
              <button
                type="button"
                className="min-h-11 text-sm text-navy/55"
                onClick={() => setStep("ficha")}
              >
                ← Voltar
              </button>
              <CardTitle className="mt-2">Pagamento</CardTitle>
              <p className="mt-2 text-sm text-navy/70">
                {longDateLabel(dayKey(session.scheduledAt))} ·{" "}
                {formatTime(session.scheduledAt)} · {formatCurrency(amount)}
              </p>
              <p className="mt-2 text-xs text-navy/50">
                Pague fora do app e volte para enviar o comprovante. O Jogo não é confirmado
                automaticamente.
              </p>

              {house.pix_key ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-navy/50">
                    {house.pix_holder_name || "Beneficiário configurado na casa"}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pixQrDataUrl(pixPayload(session.scheduledAt), "Jogo")}
                    alt="QR Pix do Jogo"
                    className="mx-auto h-44 w-44 rounded-xl border border-navy/10 bg-card p-2"
                  />
                  <p className="text-center font-display text-2xl text-gold-deep">
                    {formatCurrency(amount)}
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full min-h-11"
                    onClick={() => void copyPix()}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copiado" : "Copiar chave PIX"}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-3 text-sm text-amber-950">
                  Chave Pix ainda não cadastrada nas configurações da casa. O pagamento pode
                  ser combinado pelo canal indicado pela casa — sem inventar chave neste app.
                </p>
              )}

              <Button
                variant="gold"
                className="mt-4 w-full min-h-11"
                onClick={() => setStep("comprovante")}
              >
                Já paguei — enviar comprovante →
              </Button>
            </Card>
            <div className="hidden lg:block">{summaryCard}</div>
          </div>
        ) : null}

        {step === "comprovante" && session ? (
          <Card className="mx-auto max-w-xl">
            <button
              type="button"
              className="min-h-11 text-sm text-navy/55"
              onClick={() => setStep("pix")}
            >
              ← Voltar
            </button>
            <CardTitle className="mt-2">Enviar comprovante</CardTitle>
            <p className="mt-2 text-sm text-navy/65">
              JPG, PNG ou PDF · até 5 MB. O arquivo não fica público.
            </p>
            <form onSubmit={(e) => void onUploadProof(e)} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="jogo-proof">Arquivo do comprovante</Label>
                <Input
                  id="jogo-proof"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="gold"
                className="w-full min-h-11"
                disabled={uploading}
              >
                {uploading ? "Enviando…" : "Enviar comprovante"}
              </Button>
            </form>
          </Card>
        ) : null}

        {step === "status" && session ? (
          <Card className="mx-auto max-w-md border-l-4 border-l-leaf text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-leaf" />
            <CardTitle className="mt-3 text-2xl">
              {session.jogoStatus === "confirmado"
                ? "Jogo confirmado"
                : "Aguardando aprovação do Pai de Santo"}
            </CardTitle>
            <p className="mt-2 text-sm text-navy/70">
              {longDateLabel(dayKey(session.scheduledAt))} ·{" "}
              {formatTime(session.scheduledAt)} · {modalidadeLabel(session.modalidade)}
            </p>
            {session.jogoStatus !== "confirmado" ? (
              <div className="mt-4 space-y-2 rounded-2xl bg-mist/70 px-3 py-3 text-sm text-navy/70">
                <p>Seu comprovante foi recebido.</p>
                <p>A confirmação do Jogo pode levar até 24 horas.</p>
                <p>Você receberá a resposta pelo e-mail informado.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-navy/70">
                  Use o link seguro enviado por e-mail para acessar o atendimento.
                </p>
                {session.accessToken ? (
                  <Link href={visitorAccessPath(session.accessToken)}>
                    <Button variant="gold" className="w-full min-h-11">
                      Abrir meu atendimento
                    </Button>
                  </Link>
                ) : null}
              </div>
            )}
            <EnableJogoPush
              appointmentId={session.appointmentId}
              accessToken={session.accessToken}
              guestSecret={session.guestSecret}
            />
            <p className="mt-4 font-display text-xl text-navy">{session.fichaCode}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="secondary" onClick={resetFlow}>
                Nova marcação
              </Button>
              <Link href="/">
                <Button variant="secondary" className="w-full">
                  Voltar ao início
                </Button>
              </Link>
            </div>
          </Card>
        ) : null}

        {step !== "status" && step !== "aviso" ? (
          <div className="mt-8 lg:hidden">
            <HelpFooter />
          </div>
        ) : null}
      </div>
      <PublicBottomNav />
    </div>
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
          className="inline-flex min-h-11 items-center gap-1.5 font-medium text-navy/70"
          onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
        >
          <Phone className="h-3.5 w-3.5 text-gold-deep" />
          WhatsApp
        </button>
        <span className="text-navy/20">|</span>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 font-medium text-navy/70"
        >
          <Home className="h-3.5 w-3.5 text-gold-deep" />
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
