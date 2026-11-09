"use client";

import { FormEvent, useState } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import {
  isValidEmail,
  isValidPhone,
  maskPhone,
  profilePrefill,
} from "@/lib/oficinas";
import { cn } from "@/lib/utils";
import type { FilhoDaCasaResposta, InscricaoOficina, Oficina } from "@/types";

type Props = {
  oficina: Oficina;
  forceWaitlist?: boolean;
  onSuccess: (inscricao: InscricaoOficina, waitlist: boolean) => void;
  onCancel?: () => void;
};

export function OficinaInscricaoForm({
  oficina,
  forceWaitlist,
  onSuccess,
  onCancel,
}: Props) {
  const { currentUser, inscreverOficina } = useAppStore();
  const pref = profilePrefill(currentUser);

  const [nome, setNome] = useState(pref.nome_completo);
  const [telefone, setTelefone] = useState(pref.telefone);
  const [email, setEmail] = useState(pref.email);
  const [nasc, setNasc] = useState("");
  const [filho, setFilho] = useState<FilhoDaCasaResposta>("Frequentador");
  const [jaParticipou, setJaParticipou] = useState(false);
  const [acess, setAcess] = useState("");
  const [obs, setObs] = useState("");
  const [aceite, setAceite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!nome.trim()) next.nome = "Informe o nome completo.";
    if (!isValidPhone(telefone)) next.telefone = "Telefone/WhatsApp inválido.";
    if (!isValidEmail(email)) next.email = "E-mail inválido.";
    if (!aceite) next.aceite = "É preciso aceitar as orientações da casa.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate() || busy) return;
    setBusy(true);
    try {
      const result = inscreverOficina({
        oficina_id: oficina.id,
        nome_completo: nome,
        telefone,
        email,
        data_nascimento: nasc || undefined,
        e_filho_da_casa: filho,
        ja_participou_antes: jaParticipou,
        necessidade_especial_ou_acessibilidade: acess || undefined,
        observacoes: obs || undefined,
        aceite_termos: aceite,
        force_waitlist: forceWaitlist,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSuccess(result.inscricao, result.waitlist);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-sm text-navy outline-none ring-gold focus:ring-2";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy/45">
          Inscrição
        </p>
        <h2 className="mt-1 font-display text-xl text-navy">{oficina.titulo}</h2>
      </div>

      <Field label="Nome completo" error={errors.nome} htmlFor="oins-nome">
        <input
          id="oins-nome"
          className={field}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          required
        />
      </Field>

      <Field label="Telefone / WhatsApp" error={errors.telefone} htmlFor="oins-tel">
        <input
          id="oins-tel"
          className={field}
          value={telefone}
          onChange={(e) => setTelefone(maskPhone(e.target.value))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 90000-0000"
          required
        />
      </Field>

      <Field label="E-mail" error={errors.email} htmlFor="oins-email">
        <input
          id="oins-email"
          type="email"
          className={field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Data de nascimento (opcional)" htmlFor="oins-nasc">
        <input
          id="oins-nasc"
          type="date"
          className={field}
          value={nasc}
          onChange={(e) => setNasc(e.target.value)}
        />
      </Field>

      <Field label="É filho(a) da casa?" htmlFor="oins-filho">
        <select
          id="oins-filho"
          className={field}
          value={filho}
          onChange={(e) => setFilho(e.target.value as FilhoDaCasaResposta)}
        >
          <option value="Sim">Sim</option>
          <option value="Não">Não</option>
          <option value="Frequentador">Frequentador</option>
        </select>
      </Field>

      <label className="flex min-h-11 items-center gap-3 text-sm text-navy">
        <input
          type="checkbox"
          className="h-5 w-5 accent-navy"
          checked={jaParticipou}
          onChange={(e) => setJaParticipou(e.target.checked)}
        />
        Já participei de oficinas da casa
      </label>

      <Field label="Necessidade especial / acessibilidade (opcional)" htmlFor="oins-acess">
        <textarea
          id="oins-acess"
          className={cn(field, "min-h-[4.5rem] resize-y")}
          value={acess}
          onChange={(e) => setAcess(e.target.value)}
        />
      </Field>

      <Field label="Observações (opcional)" htmlFor="oins-obs">
        <textarea
          id="oins-obs"
          className={cn(field, "min-h-[4.5rem] resize-y")}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </Field>

      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm text-navy">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-navy"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
            required
          />
          <span>
            Concordo com as orientações da casa e autorizo o contato sobre esta
            oficina
          </span>
        </label>
        {errors.aceite ? (
          <p className="mt-1 text-xs text-danger">{errors.aceite}</p>
        ) : null}
      </div>

      {formError ? (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-[#e2c57a] via-[#d4ad4f] to-[#c99a38] px-5 text-sm font-semibold text-navy shadow-[0_8px_22px_rgba(11,31,58,0.1)] disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Confirmar inscrição"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-navy/60"
          >
            Voltar
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-navy">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
