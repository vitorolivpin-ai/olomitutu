"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function CadastrarPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white/80 p-6 text-center shadow-soft">
          <BrandMark className="mx-auto h-24 w-24" />
          <p className="text-sm text-navy/70">
            Cadastro real exige Supabase configurado. No modo demo use as contas
            do README.
          </p>
          <Link href="/entrar/cliente" className="text-sm text-navy underline">
            Entrar como cliente (demo)
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    const supabase = createBrowserClient();
    if (!supabase) {
      setError("Supabase não disponível.");
      setPending(false);
      return;
    }

    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/entrar/cliente`,
      },
    });

    setPending(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    if (data.session) {
      router.replace("/entrar/cliente");
      return;
    }

    setInfo("Conta criada. Verifique seu e-mail para confirmar, depois entre.");
  }

  return (
    <div className="bg-app flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-rise space-y-5">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="mb-2 h-36 w-36" priority />
          <p className="text-sm font-semibold text-gold-deep">Cliente</p>
          <h1 className="mt-1 font-display text-2xl text-navy">Criar conta</h1>
          <p className="mt-1 text-sm text-navy/60">
            Cadastro público cria perfil de cliente. Equipe da casa é criada no
            painel.
          </p>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white/90 p-5 shadow-soft">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-navy">
                Nome completo
              </label>
              <input
                id="full_name"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-navy">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
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
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            ) : null}
            {info ? (
              <p className="rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy/80">{info}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-cream transition hover:bg-navy-mid disabled:opacity-60"
            >
              {pending ? "Criando…" : "Cadastrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-navy/55">
          Já tem conta?{" "}
          <Link href="/entrar/cliente" className="text-navy underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
