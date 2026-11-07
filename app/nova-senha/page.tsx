"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPageFrame } from "@/components/brand/auth-page-frame";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <AuthPageFrame>
        <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-soft">
          <p className="text-sm text-navy/70">Supabase não configurado.</p>
          <Link href="/" className="text-sm text-navy underline">
            Voltar
          </Link>
        </div>
      </AuthPageFrame>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    const supabase = createBrowserClient();
    if (!supabase) {
      setError("Supabase não disponível.");
      setPending(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Após redefinir senha, manda direto ao app do cliente (já autenticado)
    router.replace("/cliente");
  }

  return (
    <AuthPageFrame>
        <div className="flex flex-col items-center text-center">
          <h1 className="mt-1 font-display text-2xl text-navy">Nova senha</h1>
          <p className="mt-1 text-sm text-navy/60">Defina uma senha nova para sua conta.</p>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white/90 p-5 shadow-soft">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-navy">
                Nova senha
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
            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-navy">
                Confirmar senha
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {pending ? "Salvando…" : "Salvar senha"}
            </button>
          </form>
        </div>
    </AuthPageFrame>
  );
}
