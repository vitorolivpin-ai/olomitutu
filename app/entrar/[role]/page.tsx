import Link from "next/link";
import { BrandMark } from "@/components/brand/logo";
import { ClearPreviousSession } from "./clear-session";
import { areaTitle, DEMO_ACCOUNTS, isAreaRole } from "@/lib/demo-accounts";
import { DEMO_PASSWORD } from "@/lib/seed";

type Props = {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ erro?: string }>;
};

/**
 * Login de UMA área só — e-mail e senha, sem atalhos das outras abas.
 */
export default async function EntrarAreaPage({ params, searchParams }: Props) {
  const { role } = await params;
  const { erro } = await searchParams;

  if (!isAreaRole(role)) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white/80 p-6 text-center shadow-soft">
          <BrandMark className="mx-auto h-24 w-24" />
          <p className="text-sm text-navy/70">Área inválida.</p>
          <Link href="/" className="text-sm text-navy underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const account = DEMO_ACCOUNTS[role];

  return (
    <div className="bg-app flex min-h-screen items-center justify-center px-4 py-10">
      <ClearPreviousSession />
      <div className="w-full max-w-md animate-rise space-y-5">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="mb-2 h-36 w-36" priority />
          <p className="text-sm font-semibold text-gold-deep">{account.label}</p>
          <h1 className="mt-1 font-display text-2xl text-navy">Entrar</h1>
          <p className="mt-1 text-sm text-navy/60">{account.hint}</p>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white/90 p-5 shadow-soft">
          <form action="/api/entrar" method="post" className="space-y-4">
            <input type="hidden" name="role" value={role} />

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-navy">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={account.email}
                autoComplete="username"
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
                className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
              />
            </div>

            {erro ? (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-cream transition hover:bg-navy-mid"
            >
              Entrar em {areaTitle(role)}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-navy/50">
            Conta desta área:{" "}
            <span className="font-medium text-navy/70">{account.email}</span>
            <br />
            Senha demo: <span className="font-medium text-navy/70">{DEMO_PASSWORD}</span>
          </p>
        </div>

        <Link href="/" className="block text-center text-sm text-navy/55 hover:text-navy">
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}
