"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Copy, MessageCircle } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { CLIENT_WHATSAPP, openWhatsApp } from "@/lib/client-whatsapp";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { buildPixCopyPaste, pixQrDataUrl } from "@/lib/pix";
import { buildSlotViews } from "@/lib/slots";

const DEFAULT_AMOUNT = 150;

/**
 * Marcação pública — sem criar conta.
 * Horário livre some ao agendar; ficha única só o Pai vê.
 */
export default function MarcarPublicoPage() {
  const { state, bookGuestAppointment } = useAppStore();
  const [step, setStep] = useState<"lista" | "ficha" | "pix" | "ok">("lista");
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

  const amount = DEFAULT_AMOUNT;
  const house = state.houseSettings ?? {};

  const livres = useMemo(
    () =>
      buildSlotViews(state.publishedSlots ?? [], state.appointments).filter(
        (v) => v.status === "livre",
      ),
    [state.publishedSlots, state.appointments],
  );

  function pixPayload(scheduledAt: string) {
    if (!house.pix_key) return "";
    return buildPixCopyPaste({
      key: house.pix_key,
      holderName: house.pix_holder_name,
      amount,
      description: `Consulta ${formatDateTime(scheduledAt).slice(0, 28)}`,
    });
  }

  function pickSlot(at: string) {
    setError("");
    setSlotAt(at);
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
      setStep("lista");
      setSlotAt(null);
      return;
    }
    setFichaCode(result.ficha_code);
    setConfirmedAt(slotAt);
    setStep("ok");
  }

  return (
    <div className="min-h-screen bg-app px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <BrandMark className="h-16 w-16 shrink-0" priority />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gold-deep">
              Aberto a todos
            </p>
            <h1 className="font-display text-3xl text-navy">Marcar horário</h1>
            <p className="mt-1 text-sm text-navy/55">
              Sem criar conta. Pagamento via Pix. Sua ficha fica só com o Pai.
            </p>
          </div>
        </div>

        {error ? <ErrorMessage message={error} /> : null}

        {step === "ok" ? (
          <Card className="border-l-4 border-l-leaf text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-leaf" />
            <CardTitle className="mt-3 text-2xl">Horário reservado</CardTitle>
            <p className="mt-2 text-sm text-navy/70">{formatDateTime(confirmedAt)}</p>
            <p className="mt-4 font-display text-xl text-navy">{fichaCode}</p>
            <p className="mt-1 text-xs text-navy/50">
              Guarde este código. Os dados da ficha só o Pai de Santo vê.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant="gold"
                onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
              >
                <MessageCircle className="h-4 w-4" />
                Falar com o Pai no WhatsApp
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("lista");
                  setSlotAt(null);
                  setFichaCode("");
                  setFullName("");
                  setPhone("");
                  setEmail("");
                  setBirthDate("");
                  setObservation("");
                }}
              >
                Ver outros horários
              </Button>
            </div>
          </Card>
        ) : null}

        {step === "lista" ? (
          <>
            <Card>
              <CardTitle>Horários livres</CardTitle>
              <p className="mt-1 text-xs text-navy/50">
                Cada marcação remove o horário da lista.
              </p>
              <div className="mt-3 grid gap-2">
                {livres.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => pickSlot(slot.scheduled_at)}
                    className="flex w-full items-center justify-between gap-2 rounded-2xl bg-mist/70 p-3 text-left transition hover:bg-mist"
                  >
                    <div>
                      <p className="font-medium text-navy">
                        {formatDateTime(slot.scheduled_at)}
                      </p>
                      <p className="text-xs text-navy/55">
                        {slot.duration_minutes} min · {formatCurrency(amount)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gold-deep">Marcar →</span>
                  </button>
                ))}
                {livres.length === 0 ? (
                  <EmptyState title="Nenhum horário livre no momento" />
                ) : null}
              </div>
            </Card>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => openWhatsApp(CLIENT_WHATSAPP.duvidas.href)}
            >
              <MessageCircle className="h-4 w-4" />
              Falar com o Pai (WhatsApp)
            </Button>
          </>
        ) : null}

        {step === "ficha" && slotAt ? (
          <Card>
            <button
              type="button"
              className="text-sm text-navy/55"
              onClick={() => {
                setStep("lista");
                setSlotAt(null);
              }}
            >
              ← Voltar
            </button>
            <CardTitle className="mt-2">Sua ficha</CardTitle>
            <p className="mt-1 text-sm text-navy/60">
              {formatDateTime(slotAt)} · só o Pai de Santo verá estes dados
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
                <Label>Telefone (WhatsApp)</Label>
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
                Continuar para o Pix
              </Button>
            </form>
          </Card>
        ) : null}

        {step === "pix" && slotAt ? (
          <Card className="border-l-4 border-l-gold">
            <button
              type="button"
              className="text-sm text-navy/55"
              onClick={() => setStep("ficha")}
            >
              ← Voltar
            </button>
            <CardTitle className="mt-2">Pagar com Pix</CardTitle>
            <p className="mt-2 text-sm text-navy/70">
              {formatDateTime(slotAt)} · {formatCurrency(amount)}
            </p>

            {house.pix_key ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-navy/50">
                  {house.pix_holder_name || "ILÉ OLÓRÒKÈ ÀṢẸ"}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pixQrDataUrl(pixPayload(slotAt), "Consulta")}
                  alt="QR Pix"
                  className="mx-auto h-44 w-44 rounded-xl border border-navy/10 bg-white p-2"
                />
                <Button variant="secondary" className="w-full" onClick={() => void copyPix()}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiado" : "Copiar Pix"}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-amber-900">
                Chave Pix ainda não cadastrada. Fale com o Pai pelo WhatsApp.
              </p>
            )}

            <Button variant="gold" className="mt-4 w-full" onClick={confirmBook}>
              Já paguei — confirmar marcação
            </Button>
          </Card>
        ) : null}

        <p className="text-center text-xs text-navy/45">
          <Link href="/" className="underline">
            Voltar ao menu
          </Link>
        </p>
      </div>
    </div>
  );
}
