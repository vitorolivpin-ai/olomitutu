import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  /** Href do botão voltar. `null` / omitido = sem botão (telas internas). */
  backHref?: string | null;
  backLabel?: string;
  logoSize?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
};

const logoClass = {
  sm: "h-16 w-16",
  md: "h-[4.75rem] w-[4.75rem]",
  lg: "h-[9.75rem] w-[9.75rem] sm:h-[11rem] sm:w-[11rem]",
} as const;

/**
 * Cabeçalho padrão: [voltar] + brasão central + título + subtítulo.
 * Não repete o nome da casa (já está no brasão).
 */
export function BrandPageHeader({
  title,
  subtitle,
  backHref = null,
  backLabel = "Voltar ao início",
  logoSize = "md",
  className,
  priority = false,
}: Props) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative mb-1 flex items-center justify-center">
        {backHref ? (
          <Link
            href={backHref}
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-[0_4px_14px_rgba(11,31,58,0.08)] ring-1 ring-navy/[0.04]"
            aria-label={backLabel}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
        ) : null}
        <BrandMark className={logoClass[logoSize]} priority={priority} />
      </div>
      <header className="mt-3 text-center">
        <h1 className="font-display text-[2rem] font-semibold leading-none text-navy">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-navy/55">{subtitle}</p>
        ) : null}
      </header>
    </div>
  );
}
