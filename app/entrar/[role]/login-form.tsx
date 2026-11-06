"use client";

import { FormEvent, useState } from "react";
import { areaTitle } from "@/lib/demo-accounts";
import { useAppStore } from "@/hooks/use-app-store";
import { homePathForRole } from "@/lib/navigation";
import { getSupabasePublicEnv } from "@/lib/supabase/config";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  ensureClienteLinked,
  fetchProfileRowDetailed,
  mapProfileRow,
} from "@/lib/supabase/profile";
import type { UserRole } from "@/types";

type Props = {
  role: UserRole;
  initialError?: string | null;
};

/**
 * Login no browser — grava a sessão Auth e o perfil no store antes de abrir a área.
 */
export function LoginForm({ role, initialError }: Props) {
  const { hydrateAuthProfile } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createBrowserClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setPending(false);
      return;
    }

    const { data, error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signError || !data.user) {
      const host = getSupabasePublicEnv().url.replace(/^https?:\/\//, "") || "?";
      const raw = signError?.message || "Não foi possível entrar.";
      const msg = raw.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setError(
          `E-mail ainda não confirmado (projeto ${host}). No Supabase → Authentication → Users, confirme o e-mail.`,
        );
      } else if (msg.includes("invalid") || msg.includes("credentials")) {
        setError(
          `E-mail ou senha inválidos (projeto ${host}). No Supabase desse mesmo projeto: Authentication → Users → resele a senha ou crie o usuário de novo com Auto Confirm.`,
        );
      } else {
        setError(`${raw} (${host})`);
      }
      setPending(false);
      return;
    }

    if (data.session) {
      await supabase.auth.setSession(data.session);
    }

    let { row: profile, errorMessage } = await fetchProfileRowDetailed(
      supabase,
      data.user.id,
    );

    if (!profile) {
      await supabase.auth.signOut();
      const host = getSupabasePublicEnv().url.replace(/^https?:\/\//, "");
      setError(
        `Perfil não encontrado neste Supabase (${host || "?"} / id ${data.user.id.slice(0, 8)}…). ` +
          `Rode a migration 015 no SQL Editor. ${errorMessage ? `Detalhe: ${errorMessage}` : ""}`,
      );
      setPending(false);
      return;
    }

    if (profile.role === "cliente" && !profile.client_id) {
      profile = await ensureClienteLinked(supabase, profile);
    }
    if (profile.role === "cliente" && !profile.client_id) {
      setError(
        "Não foi possível abrir a ficha do cliente. No Supabase, rode a migration 017_ensure_client.sql e tente de novo.",
      );
      setPending(false);
      return;
    }

    const status = (profile.approval_status as string | null) ?? "approved";
    const requested = (profile.requested_role as string | null) ?? profile.role;
    const signupArea = (profile.signup_area as string | null) ?? requested;

    if (
      status === "pending" &&
      (requested === role || profile.role === role || signupArea === role)
    ) {
      await supabase.auth.signOut();
      setError(
        "Cadastro aguardando aprovação do Pai de Santo. Quando aceito, entre de novo nesta mesma aba.",
      );
      setPending(false);
      return;
    }

    if (status === "rejected" && (requested === role || signupArea === role)) {
      await supabase.auth.signOut();
      setError("Este cadastro foi recusado. Fale com a casa.");
      setPending(false);
      return;
    }

    if (profile.role !== role) {
      await supabase.auth.signOut();
      if (status === "pending" && (signupArea === role || requested === role)) {
        setError("Cadastro ainda pendente — o Pai precisa aceitar antes do acesso.");
      } else {
        setError(
          `Esta conta é da área "${signupArea || profile.role}", não desta aba. Entre em /entrar/${signupArea || profile.role}.`,
        );
      }
      setPending(false);
      return;
    }

    hydrateAuthProfile(mapProfileRow(profile));
    // Navegação completa: garante cookies Auth + store hidratado na área
    window.location.assign(homePathForRole(role));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-navy">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-navy">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-cream transition hover:bg-navy-mid disabled:opacity-60"
      >
        {pending ? "Entrando…" : `Entrar em ${areaTitle(role)}`}
      </button>
    </form>
  );
}
