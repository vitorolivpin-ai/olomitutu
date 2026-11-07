import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Tela de abertura: navy liso + brasão oficial (com leão) centralizado.
 * Sem texto extra, cards, grafismos ou moldura branca.
 */
export function AppSplash({ className }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex min-h-dvh items-center justify-center bg-navy",
        className,
      )}
      role="status"
      aria-label="Carregando OLÓMÌ TÚTÙ"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- splash precisa do PNG transparente sem otimizador/cache antigo */}
      <img
        src="/brasao-designer.png"
        alt="ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ"
        width={1024}
        height={1024}
        decoding="async"
        className="splash-brasao h-auto w-[min(70vw,24rem)] object-contain"
      />
    </div>
  );
}
