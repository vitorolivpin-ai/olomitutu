import Link from "next/link";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";

/**
 * Política de Privacidade pública (exigida pelo Google OAuth / Branding).
 */
export default function PrivacidadePage() {
  return (
    <BrandPageShell>
      <BrandPageHeader
        title="Política de Privacidade"
        subtitle="OLÓMÌ TÚTÙ — ILÊ OLÓRÒKÈ ÀṢẸ"
        backHref="/"
        priority
      />

      <article className="mt-5 space-y-4 rounded-[20px] bg-card p-5 text-sm leading-relaxed text-navy/80 shadow-soft ring-1 ring-navy/[0.04]">
        <p>
          Este app é usado pela casa ILÊ OLÓRÒKÈ ÀṢẸ para agenda, jogos de búzios e
          comunicação com clientes e filhos de santo.
        </p>
        <p>
          Quando o Pai de Santo conecta o <strong>Google Calendar</strong>, pedimos
          permissão apenas para criar, atualizar e remover eventos da agenda dele
          relacionados a jogos confirmados ou cancelados. Não lemos e-mails nem outros
          dados da conta Google além do necessário para essa sincronização.
        </p>
        <p>
          Tokens de acesso à agenda ficam armazenados de forma segura no servidor da
          casa e podem ser revogados a qualquer momento pelo Pai (Desconectar no app ou
          em{" "}
          <a
            className="underline"
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            Conta Google → Segurança → Acesso de apps de terceiros
          </a>
          ).
        </p>
        <p>
          Dados de cadastro, comprovantes e mensagens ficam no ambiente da casa
          (Supabase / hospedagem Vercel) e são usados só para o funcionamento do ILÉ.
        </p>
        <p>
          Dúvidas: fale com a casa pelo canal oficial ou pelo e-mail de suporte
          indicado na tela de consentimento do Google.
        </p>
        <p className="text-xs text-navy/45">
          Última atualização: novembro de 2026.
        </p>
      </article>

      <Link href="/" className="mt-4 block text-center text-sm text-navy/55 hover:text-navy">
        ← Voltar ao início
      </Link>
    </BrandPageShell>
  );
}
