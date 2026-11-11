import Link from "next/link";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { BrandPageShell } from "@/components/brand/brand-page-shell";

/**
 * Termos de Serviço públicos (exigidos pelo Google OAuth / Branding).
 */
export default function TermosPage() {
  return (
    <BrandPageShell>
      <BrandPageHeader
        title="Termos de Serviço"
        subtitle="OLÓMÌ TÚTÙ — ILÊ OLÓRÒKÈ ÀṢẸ"
        backHref="/"
        priority
      />

      <article className="mt-5 space-y-4 rounded-[20px] bg-card p-5 text-sm leading-relaxed text-navy/80 shadow-soft ring-1 ring-navy/[0.04]">
        <p>
          Ao usar o app OLÓMÌ TÚTÙ, você concorda em utilizá-lo apenas para os serviços
          da casa ILÊ OLÓRÒKÈ ÀṢẸ (marcação de jogos, agenda, conteúdo e áreas
          autorizadas).
        </p>
        <p>
          A conexão com o Google Calendar é opcional e exclusiva do Pai de Santo. O app
          sincroniza eventos de jogos confirmados ou cancelados com a agenda Google
          autorizada. O Pai pode desconectar a qualquer momento.
        </p>
        <p>
          Contas demo ou de teste não substituem o login real quando recursos externos
          (como Google) forem necessários. Cada usuário é responsável por manter a
          senha em sigilo e por usar apenas a área correspondente ao seu papel.
        </p>
        <p>
          A casa pode atualizar estes termos. O uso continuado após mudanças implica
          aceite da versão publicada nesta página.
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
