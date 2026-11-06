"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { areaTitle } from "@/lib/demo-accounts";
import { homePathForRole } from "@/lib/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

type Props = {
  role: UserRole;
  initialError?: string | null;
};

/**
 * Login no browser — grava a sessão Auth nos cookies que o app lê.
 * O POST /api/entrar no servidor às vezes não repassa a sessão ao cliente.
 */
export function LoginForm({ role, initialError }: Props) {
  const router = useRouter();
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
      const msg = signError?.message?.toLowerCase() ?? "";
      setError(
        msg.includes("invalid") || msg.includes("credentials")
          ? "E-mail ou senha inválidos."
          : signError?.message || "Não foi possível entrar.",
      );
      setPending(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, requested_role, approval_status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError(
        "Perfil não encontrado. No Supabase, rode o SQL que cria o perfil do Pai.",
      );
      setPending(false);
      return;
    }

    const status = (profile.approval_status as string | null) ?? "approved";
    const requested = (profile.requested_role as string | null) ?? profile.role;

    if (status === "pending" && (requested === role || profile.role === role)) {
      await supabase.auth.signOut();
      setError("Cadastro aguardando aprovação do Pai de Santo.");
      setPending(false);
      return;
    }

    if (status === "rejected" && requested === role) {
      await supabase.auth.signOut();
      setError("Este cadastro foi recusado. Fale com a casa.");
      setPending(false);
      return;
    }

    if (profile.role !== role) {
      await supabase.auth.signOut();
      setError("Esta conta não tem acesso a esta área. Use o e-mail desta aba.");
      setPending(false);
      return;
    }

    document.cookie = `ile-oloroke-sid=${encodeURIComponent(profile.id)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    router.replace(homePathForRole(role));
    router.refresh();
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
