import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  /** Href do botão voltar. `null` / omitido = sem botão (telas internas). */
  backHref?: string | null;
  backLabel?: string;
  /** @deprecated brasão removido dos cabeçalhos — mantido só por compat. */
  logoSize?: "sm" | "md" | "lg";
  className?: string;
  /** @deprecated */
  priority?: boolean;
};

/**
 * Cabeçalho minimalista: [←] Título + subtítulo.
 * Brasão só na Splash Screen — nunca aqui.
 */
export function BrandPageHeader({
  title,
  subtitle,
  backHref = null,
  backLabel = "Voltar",
  className,
}: Props) {
  return (
    <div className={cn("w-full", className)}>
      <header className="flex items-start gap-3">
        {backHref ? (
          <Link
            href={backHref}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-navy shadow-[0_4px_14px_rgba(11,50,107,0.08)] ring-1 ring-navy/[0.04]"
            aria-label={backLabel}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight text-navy sm:text-[2rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm leading-snug text-muted">{subtitle}</p>
          ) : null}
        </div>
      </header>
    </div>
  );
}
