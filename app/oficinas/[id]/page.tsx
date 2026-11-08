"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Monitor,
  Users,
} from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorMessage, LoadingBlock } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { StatusPill, WorkshopImage } from "@/components/workshops/workshop-card";
import { useAppStore } from "@/hooks/use-app-store";
import { useWorkshops } from "@/hooks/use-workshops";
import {
  canRegister,
  formatPhone,
  formatPrice,
  formatTimeRange,
  formatWeekdayDate,
  MODALITY_LABEL,
  publicState,
} from "@/lib/workshops";
import type { Workshop, WorkshopHouseLink, WorkshopRegistration } from "@/types";

function icsFor(w: Workshop) {
  if (!w.date) return "";
  const d = w.date.replace(/-/g, "");
  const t = (v?: string) => (v ? `${v.replace(":", "")}00` : "000000");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Olomi Tutu//Oficinas//PT",
    "BEGIN:VEVENT",
    `UID:${w.id}@olomitutu`,
    `DTSTART;TZID=America/Sao_Paulo:${d}T${t(w.start_time)}`,
    `DTEND;TZID=America/Sao_Paulo:${d}T${t(w.end_time || w.start_time)}`,
    `SUMMARY:${w.title}`,
    `LOCATION:${w.modality === "online" ? "Online" : (w.location ?? "Ilé Olóròkè Àṣẹ")}`,
    `DESCRIPTION:${(w.short_description ?? "").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

export default function OficinaDetalhePage() {
  const params = useParams<{ id: string }>();
  const { currentUser } = useAppStore();
  const { workshops, spotsFor, ready, register, myRegistration, cancelMyRegistration } =
    useWorkshops();
  const workshop = workshops.find((w) => w.id === params.id);

  const [showForm, setShowForm] = useState(false);
  const [done, setDone] = useState<WorkshopRegistration | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const [fullName, setFullName] = useState(currentUser?.full_name ?? "");
  const [phone, setPhone] = useState(formatPhone(currentUser?.phone ?? ""));
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [birth, setBirth] = useState("");
  const [houseLink, setHouseLink] = useState<WorkshopHouseLink>("nao");
  const [attended, setAttended] = useState(false);
  const [access, setAccess] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);

  const spots = useMemo(() => (workshop ? spotsFor(workshop) : null), [workshop, spotsFor]);
  const mine = workshop ? myRegistration(workshop.id) : undefined;

  if (!ready) {
    return (
      <BrandPageShell>
        <LoadingBlock label="Carregando oficina…" />
      </BrandPageShell>
    );
  }

  if (!workshop || !spots || workshop.status === "rascunho") {
    return (
      <BrandPageShell>
        <BrandPageHeader title="Oficina" backHref="/oficinas" />
        <div className="mt-5">
          <EmptyState title="Oficina não encontrada" description="Ela pode ter sido removida." />
        </div>
      </BrandPageShell>
    );
  }

  const st = publicState(workshop, spots);
  const time = formatTimeRange(workshop);
  const progress = spots.total > 0 ? Math.min(100, (spots.confirmed / spots.total) * 100) : 0;
  const waitlistMode = st === "espera";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workshop) return;
    setError("");
    setSending(true);
    const res = await register(workshop.id, {
      workshop_id: workshop.id,
      full_name: fullName,
      phone,
      email,
      birth_date: birth || undefined,
      house_link: houseLink,
      attended_before: attended,
      accessibility_needs: access.trim() || undefined,
      notes: notes.trim() || undefined,
      accepted_terms: terms,
    });
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(res.data ?? null);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    const waiting = done.status === "lista_espera";
    return (
      <BrandPageShell>
        <BrandPageHeader title="Inscrição" backHref="/oficinas" backLabel="Oficinas" />
        <Card className="mt-5 text-center">
          {waiting ? (
            <Hourglass className="mx-auto h-12 w-12 text-gold-deep" />
          ) : (
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          )}
          <h2 className="mt-3 font-display text-2xl text-navy">
            {waiting ? "Você está na lista de espera" : "Inscrição confirmada"}
          </h2>
          <p className="mt-2 text-navy/70">
            {waiting
              ? "Se uma vaga abrir, a casa entra em contato pelo WhatsApp."
              : `Te esperamos em ${workshop.title}.`}
          </p>
          <div className="mt-4 rounded-2xl bg-mist/70 p-4 text-left text-sm text-navy/80">
            <p className="font-semibold text-navy">{workshop.title}</p>
            {workshop.date ? <p className="mt-1">{formatWeekdayDate(workshop.date)}</p> : null}
            {time ? <p>{time}</p> : null}
            <p>
              {workshop.modality === "online"
                ? "Online — o link chega pelo WhatsApp/e-mail"
                : (workshop.location ?? "Ilé Olóròkè Àṣẹ")}
            </p>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {!waiting && workshop.date ? (
              <a href={icsFor(workshop)} download={`oficina-${workshop.id}.ics`}>
                <Button variant="secondary" className="w-full">
                  <CalendarPlus className="h-5 w-5" /> Adicionar à agenda
                </Button>
              </a>
            ) : null}
            <Link href="/oficinas" className={!waiting && workshop.date ? "" : "sm:col-span-2"}>
              <Button variant="primary" className="w-full">
                Ver outras oficinas
              </Button>
            </Link>
          </div>
        </Card>
      </BrandPageShell>
    );
  }

  return (
    <BrandPageShell>
      <BrandPageHeader title="Detalhes da oficina" backHref="/oficinas" backLabel="Oficinas" />

      <div className="mt-5 overflow-hidden rounded-3xl border border-navy/8 bg-card shadow-soft">
        <div className="aspect-[16/9] w-full">
          <WorkshopImage workshop={workshop} />
        </div>
        <div className="p-4 sm:p-5">
          <h1 className="font-display text-3xl leading-tight text-navy">{workshop.title}</h1>
          <p className="mt-1 text-navy/70">{workshop.short_description}</p>

          <ul className="mt-4 grid gap-2 text-sm text-navy/80">
            <li className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-gold-deep" />
              {workshop.date ? formatWeekdayDate(workshop.date) : "Data a definir"}
            </li>
            {time ? (
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-gold-deep" />
                {time}
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              {workshop.modality === "online" ? (
                <Monitor className="h-4 w-4 shrink-0 text-gold-deep" />
              ) : (
                <MapPin className="h-4 w-4 shrink-0 text-gold-deep" />
              )}
              {workshop.modality === "online"
                ? "Online"
                : `${MODALITY_LABEL.presencial} · ${workshop.location ?? "Ilé Olóròkè Àṣẹ"}`}
            </li>
            {workshop.issues_certificate ? (
              <li className="flex items-center gap-2">
                <Award className="h-4 w-4 shrink-0 text-gold-deep" />
                Com certificado de participação{workshop.workload ? ` · ${workshop.workload}` : ""}
              </li>
            ) : null}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold/20 px-3 py-1 text-sm font-semibold text-navy">
              {formatPrice(workshop.price)}
            </span>
            <StatusPill workshop={workshop} spots={spots} />
          </div>
        </div>
      </div>

      {spots.total > 0 && st !== "em_breve" ? (
        <Card className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-navy">
              <Users className="h-4 w-4 text-gold-deep" /> Vagas
            </span>
            <span className="text-navy/70">
              {spots.confirmed} de {spots.total} preenchidas
            </span>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-navy/10"
            role="progressbar"
            aria-valuenow={spots.confirmed}
            aria-valuemin={0}
            aria-valuemax={spots.total}
          >
            <div
              className={progress >= 100 ? "h-full bg-danger" : "h-full bg-gold"}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-navy/65">
            {spots.left === 0
              ? workshop.allow_waitlist
                ? "Vagas esgotadas — você ainda pode entrar na lista de espera."
                : "Vagas esgotadas."
              : spots.left === 1
                ? "Resta 1 vaga."
                : `Restam ${spots.left} vagas.`}
          </p>
        </Card>
      ) : null}

      {workshop.about ? (
        <section className="mt-5">
          <h2 className="font-display text-xl text-navy">Sobre esta oficina</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-navy/75">{workshop.about}</p>
        </section>
      ) : null}

      {workshop.topics.length > 0 ? (
        <section className="mt-5">
          <h2 className="font-display text-xl text-navy">Conteúdo</h2>
          <ul className="mt-2 space-y-2">
            {workshop.topics.map((t) => (
              <li key={t} className="flex items-start gap-2 text-navy/80">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6">
        {mine ? (
          <Card className="text-center">
            <p className="font-semibold text-navy">
              {mine.status === "lista_espera"
                ? "Você está na lista de espera desta oficina."
                : "Você já está inscrito nesta oficina."}
            </p>
            {mine.status === "confirmada" && workshop.modality === "online" && workshop.online_link ? (
              <a
                href={workshop.online_link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-gold-deep underline"
              >
                Abrir a sala online
              </a>
            ) : null}
            {mine.user_id && currentUser && mine.user_id === currentUser.id && mine.status !== "presente" ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  if (!confirm("Cancelar sua inscrição? A vaga vai para outra pessoa.")) return;
                  const r = await cancelMyRegistration(mine.id);
                  if (!r.ok) alert(r.error);
                }}
              >
                Cancelar inscrição
              </Button>
            ) : null}
          </Card>
        ) : !canRegister(workshop, spots) ? (
          <Button variant="secondary" className="w-full" disabled>
            {st === "em_breve"
              ? "Inscrições em breve"
              : st === "esgotada"
                ? "Vagas esgotadas"
                : st === "prazo"
                  ? "Inscrições encerradas"
                  : st === "cancelada"
                    ? "Oficina cancelada"
                    : "Oficina encerrada"}
          </Button>
        ) : !showForm ? (
          <Button variant="primary" className="w-full" onClick={() => setShowForm(true)}>
            {waitlistMode ? "Entrar na lista de espera" : "Quero participar"}
          </Button>
        ) : (
          <Card>
            <h2 className="font-display text-2xl text-navy">Formulário de inscrição</h2>
            <p className="mt-1 text-sm text-navy/60">
              {waitlistMode
                ? "As vagas esgotaram. Preencha para entrar na lista de espera."
                : "Preencha seus dados para garantir sua vaga."}
            </p>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="wk-nome">Nome completo *</Label>
                <Input
                  id="wk-nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <p className="mt-1 text-xs text-navy/50">É assim que o nome vai sair no certificado.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="wk-tel">WhatsApp *</Label>
                  <Input
                    id="wk-tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(21) 99999-9999"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="wk-email">E-mail *</Label>
                  <Input
                    id="wk-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="wk-nasc">Data de nascimento</Label>
                  <Input id="wk-nasc" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="wk-vinc">Você é filho(a) da casa? *</Label>
                  <Select
                    id="wk-vinc"
                    value={houseLink}
                    onChange={(e) => setHouseLink(e.target.value as WorkshopHouseLink)}
                  >
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                    <option value="frequentador">Sou frequentador(a)</option>
                  </Select>
                </div>
              </div>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-navy/80">
                  Já participou de alguma oficina da casa?
                </legend>
                <div className="flex gap-2">
                  {[
                    { v: true, l: "Sim" },
                    { v: false, l: "Não" },
                  ].map((o) => (
                    <button
                      key={o.l}
                      type="button"
                      onClick={() => setAttended(o.v)}
                      aria-pressed={attended === o.v}
                      className={
                        attended === o.v
                          ? "min-h-11 flex-1 rounded-2xl border border-navy bg-navy text-sm font-semibold text-white"
                          : "min-h-11 flex-1 rounded-2xl border border-navy/15 bg-white text-sm font-semibold text-navy/75"
                      }
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="wk-acc">Alguma necessidade de acessibilidade?</Label>
                <Input
                  id="wk-acc"
                  value={access}
                  onChange={(e) => setAccess(e.target.value)}
                  placeholder="Ex.: cadeira de rodas, intérprete de Libras…"
                />
              </div>
              <div>
                <Label htmlFor="wk-obs">Observações</Label>
                <Textarea id="wk-obs" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <label className="flex items-start gap-3 rounded-2xl bg-mist/60 p-3 text-sm text-navy/80">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#0b326b]"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  required
                />
                Li e aceito as orientações da casa e autorizo o contato pelo WhatsApp sobre esta oficina.
              </label>
              {error ? <ErrorMessage message={error} /> : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Voltar
                </Button>
                <Button type="submit" variant="primary" disabled={sending}>
                  {sending ? "Enviando…" : waitlistMode ? "Entrar na lista" : "Confirmar inscrição"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </BrandPageShell>
  );
}
