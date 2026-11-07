"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthPageFrame } from "@/components/brand/auth-page-frame";
import { BrandMark } from "@/components/brand/logo";
import { getAppOrigin } from "@/lib/supabase/config";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

function RecuperarForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(searchParams.get("erro"));
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <p className="rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy/70">
        Recuperação de senha exige Supabase. No demo use a senha{" "}
        <span className="font-medium">demo123</span>.
      </p>
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

    const redirectTo = `${getAppOrigin()}/auth/callback?next=/nova-senha`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );

    setPending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setInfo("Se o e-mail existir, enviamos um link para redefinir a senha.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-navy">
          E-mail da conta
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
        {pending ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}

export default function RecuperarSenhaPage() {
  return (
    <AuthPageFrame>
      <div className="flex flex-col items-center text-center">
        <BrandMark className="mb-2 h-40 w-40" priority />
        <h1 className="mt-1 font-display text-2xl text-navy">Esqueci a senha</h1>
        <p className="mt-1 text-sm text-navy/60">
          Enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white/90 p-5 shadow-soft">
        <Suspense fallback={<p className="text-sm text-navy/60">Carregando…</p>}>
          <RecuperarForm />
        </Suspense>
      </div>

      <Link href="/" className="block text-center text-sm text-navy/55 hover:text-navy">
        ← Voltar ao início
      </Link>
    </AuthPageFrame>
  );
}
