import Link from "next/link";
import { AuthPageFrame } from "@/components/brand/auth-page-frame";
import { ClearPreviousSession } from "./clear-session";
import { LoginForm } from "./login-form";
import {
  areaTitle,
  authRoleForArea,
  DEMO_ACCOUNTS,
  isAreaRole,
  isFilhoArea,
  type AreaSlug,
} from "@/lib/demo-accounts";
import { DEMO_PASSWORD } from "@/lib/seed";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { areaNeedsApproval, isHouseSignupRole } from "@/lib/approvals";

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
  const authReal = isSupabaseConfigured();

  if (!isAreaRole(role)) {
    return (
      <AuthPageFrame>
        <div className="space-y-4 rounded-2xl bg-card p-6 text-center shadow-soft">
          <p className="text-sm text-navy/70">Área inválida.</p>
          <Link href="/" className="text-sm text-navy underline">
            Voltar ao início
          </Link>
        </div>
      </AuthPageFrame>
    );
  }

  const area = role as AreaSlug;
  const account = DEMO_ACCOUNTS[area];
  const authRole = authRoleForArea(area);
  const canSignup =
    isFilhoArea(area) ||
    area === "cliente" ||
    area === "pai_de_santo" ||
    isHouseSignupRole(authRole);

  return (
    <AuthPageFrame>
      <ClearPreviousSession />
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-semibold text-navy/70">{account.label}</p>
        <h1 className="mt-1 font-display text-2xl text-navy">Entrar</h1>
        <p className="mt-1 text-sm text-navy/60">
          {authReal
            ? "Use o e-mail e a senha da sua conta. A conta do Pai de Santo entra em todas as áreas."
            : account.hint}
        </p>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-card p-5 shadow-soft">
        {authReal ? (
          <LoginForm area={area} initialError={erro} />
        ) : (
          <form action="/api/entrar" method="post" className="space-y-4">
            <input type="hidden" name="role" value={area} />

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-navy">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={DEMO_ACCOUNTS.pai_de_santo.email}
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
              Entrar em {areaTitle(area)}
            </button>
          </form>
        )}

        {authReal ? (
          <div className="mt-4 space-y-2 text-center text-sm text-navy/60">
            {area !== "pai_de_santo" ? (
              <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs text-navy/70">
                Sem conta nesta aba? Entre com o e-mail e a senha do{" "}
                <span className="font-medium text-navy">Pai de Santo</span> para
                abrir este perfil.
              </p>
            ) : null}
            <p>
              <Link href="/recuperar-senha" className="text-navy underline">
                Esqueci a senha
              </Link>
            </p>
            {canSignup ? (
              <p>
                Não tem conta?{" "}
                <Link href={`/cadastrar/${area}`} className="text-navy underline">
                  Cadastrar
                </Link>
              </p>
            ) : null}
            {isFilhoArea(area) ? (
              <p className="text-xs text-navy/45">
                Cadastro nesta aba libera o portal do Filho de Santo. O Pai Vitor
                precisa aceitar antes de entrar.
              </p>
            ) : isHouseSignupRole(authRole) ? (
              <p className="text-xs text-navy/45">
                Cadastro nesta aba libera só este acesso ({areaTitle(area)}).
                O Pai Vitor precisa aceitar antes de entrar.
              </p>
            ) : areaNeedsApproval(area) ? (
              <p className="text-xs text-navy/45">
                Cadastros desta área precisam ser aceitos pelo Pai de Santo.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-center text-xs text-navy/50">
            Conta desta área:{" "}
            <span className="font-medium text-navy/70">{account.email}</span>
            <br />
            Ou use o Pai:{" "}
            <span className="font-medium text-navy/70">
              {DEMO_ACCOUNTS.pai_de_santo.email}
            </span>
            <br />
            Senha demo: <span className="font-medium text-navy/70">{DEMO_PASSWORD}</span>
          </p>
        )}
      </div>

      <Link href="/" className="block text-center text-sm text-navy/55 hover:text-navy">
        ← Voltar ao início
      </Link>
    </AuthPageFrame>
  );
}
