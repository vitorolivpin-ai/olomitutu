"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthPageFrame } from "@/components/brand/auth-page-frame";
import { BrandMark } from "@/components/brand/logo";
import {
  HOUSE_SIGNUP_ROLES,
  PERSON_KIND_OPTIONS,
  areaNeedsApproval,
  isHouseSignupRole,
} from "@/lib/approvals";
import {
  areaTitle,
  authRoleForArea,
  DEMO_ACCOUNTS,
  isAreaRole,
  isFilhoArea,
  type AreaSlug,
} from "@/lib/demo-accounts";
import { getAppOrigin } from "@/lib/supabase/config";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PersonKind } from "@/types";

export default function CadastrarAreaPage() {
  const params = useParams<{ role: string }>();
  const areaParam = params.role;
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [personKind, setPersonKind] = useState<PersonKind | "">("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isAreaRole(areaParam)) {
    return (
      <AuthPageFrame>
        <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-soft">
          <BrandMark className="mx-auto h-24 w-24" />
          <p className="text-sm text-navy/70">Área inválida.</p>
          <Link href="/" className="text-sm text-navy underline">
            Voltar ao início
          </Link>
        </div>
      </AuthPageFrame>
    );
  }

  const area = areaParam as AreaSlug;
  const authRole = authRoleForArea(area);
  const account = DEMO_ACCOUNTS[area];
  const filhoForm = isFilhoArea(area);
  const houseForm = isHouseSignupRole(authRole);
  const needsApproval = areaNeedsApproval(area);
  const fullNameForm = houseForm || filhoForm;

  // Cadastro completo só nas abas pedidas; cliente/pai/filho mantêm fluxo
  if (!houseForm && !filhoForm && area !== "cliente" && area !== "pai_de_santo") {
    return (
      <AuthPageFrame>
        <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-soft">
          <p className="text-sm text-navy/70">Cadastro não disponível nesta área.</p>
          <Link href="/" className="text-sm text-navy underline">
            Voltar
          </Link>
        </div>
      </AuthPageFrame>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <AuthPageFrame>
        <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-soft">
          <BrandMark className="mx-auto h-24 w-24" />
          <p className="text-sm text-navy/70">
            Cadastro real exige Supabase configurado. No modo demo use as contas
            do README.
          </p>
          <Link href={`/entrar/${area}`} className="text-sm text-navy underline">
            Entrar em {areaTitle(area)} (demo)
          </Link>
        </div>
      </AuthPageFrame>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const nome = firstName.trim();
    const sobrenome = lastName.trim();
    if (nome.length < 2) {
      setError("Informe o nome.");
      return;
    }
    if (fullNameForm && sobrenome.length < 2) {
      setError("Informe o sobrenome.");
      return;
    }
    if (houseForm && !personKind) {
      setError("Selecione se você é Filho de Santo, Cliente ou Administrador.");
      return;
    }

    setPending(true);
    const fullName = fullNameForm ? `${nome} ${sobrenome}`.trim() : nome;
    const kind: PersonKind = filhoForm
      ? "filho_de_santo"
      : houseForm
        ? (personKind as PersonKind)
        : "cliente";

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
        data: {
          full_name: fullName,
          requested_role: authRole,
          person_kind: kind,
        },
        emailRedirectTo: `${getAppOrigin()}/auth/callback?next=/entrar/${area}`,
      },
    });

    setPending(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    if (data.user) {
      const waitApproval = needsApproval || houseForm || filhoForm;
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          requested_role: authRole,
          signup_area: authRole,
          person_kind: kind,
          approval_status: waitApproval ? "pending" : "approved",
          role: authRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);
    }

    if (needsApproval || houseForm || filhoForm) {
      if (data.session) {
        await supabase.auth.signOut();
      }
      setInfo(
        "Cadastro enviado. O Pai de Santo (Pai Vitor) precisa aceitar antes do acesso." +
          (!data.session
            ? " Se pedir confirmação de e-mail e nada chegar, a casa precisa configurar SMTP no Supabase (Authentication → SMTP)."
            : ""),
      );
      return;
    }

    if (data.session) {
      router.replace(`/entrar/${area}`);
      return;
    }

    setInfo(
      "Conta criada. Abra o e-mail de confirmação (também olhe o spam). " +
        "Se não chegar em alguns minutos: no Supabase → Authentication → SMTP configure Resend/Brevo/SendGrid, " +
        "ou em Authentication → Users confirme o e-mail manualmente. Depois entre em Entrar.",
    );
  }

  return (
    <AuthPageFrame>
        <div className="flex flex-col items-center text-center">
          <BrandMark className="mb-2 h-40 w-40" priority />
          <p className="text-sm font-semibold text-navy/70">{account.label}</p>
          <h1 className="mt-1 font-display text-2xl text-navy">Criar conta</h1>
          <p className="mt-1 text-sm text-navy/60">
            {filhoForm
              ? "Cadastro do Filho de Santo. O Pai Vitor precisa aceitar antes do acesso ao portal."
              : houseForm
                ? `Cadastro para ${account.label}. O acesso desta aba só libera depois que o Pai Vitor aceitar.`
                : needsApproval
                  ? "Após o cadastro, o Pai de Santo precisa aceitar o acesso."
                  : "Cadastro de cliente — acesso após confirmar o e-mail."}
          </p>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white/90 p-5 shadow-soft">
          <form onSubmit={onSubmit} className="space-y-4">
            {fullNameForm ? (
              <>
                <div>
                  <label htmlFor="first_name" className="mb-1 block text-sm font-medium text-navy">
                    Nome
                  </label>
                  <input
                    id="first_name"
                    required
                    minLength={2}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="mb-1 block text-sm font-medium text-navy">
                    Sobrenome
                  </label>
                  <input
                    id="last_name"
                    required
                    minLength={2}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="first_name" className="mb-1 block text-sm font-medium text-navy">
                  Nome completo
                </label>
                <input
                  id="first_name"
                  required
                  minLength={2}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
                />
              </div>
            )}

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

            {houseForm ? (
              <div>
                <label htmlFor="person_kind" className="mb-1 block text-sm font-medium text-navy">
                  Você é
                </label>
                <select
                  id="person_kind"
                  required
                  value={personKind}
                  onChange={(e) => setPersonKind(e.target.value as PersonKind | "")}
                  className="w-full rounded-xl border border-navy/15 bg-cream/40 px-3 py-2.5 text-navy outline-none ring-gold focus:ring-2"
                >
                  <option value="">Selecione…</option>
                  {PERSON_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-navy/50">
                  Informação para o Pai — o acesso liberado é o desta aba (
                  {account.label}).
                </p>
              </div>
            ) : null}

            {filhoForm ? (
              <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs text-navy/65">
                Este cadastro é do portal do Filho de Santo (mensalidade, educação,
                ajodun, chat com Vitor Cardozo - Ògún Yande).
              </p>
            ) : null}

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
              {pending ? "Enviando…" : "Enviar cadastro"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-navy/55">
          Já tem conta?{" "}
          <Link href={`/entrar/${area}`} className="text-navy underline">
            Entrar
          </Link>
        </p>
        {houseForm ? (
          <p className="text-center text-xs text-navy/40">
            Abas com este cadastro:{" "}
            {HOUSE_SIGNUP_ROLES.map((r) => areaTitle(r)).join(" · ")}
          </p>
        ) : null}
    </AuthPageFrame>
  );
}
