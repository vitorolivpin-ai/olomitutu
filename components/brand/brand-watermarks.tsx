import { cn } from "@/lib/utils";

type Variant = "home" | "biblioteca" | "default" | "faint";

type Props = {
  variant?: Variant;
  className?: string;
};

/**
 * Opacidade da camada — 25–30%.
 * Não empilhar opacity no asset + no container além desta classe.
 */
const OPACITY = "opacity-[0.28] sm:opacity-[0.30]";

/**
 * Grafismos decorativos globais — composição da referência Designer.
 * Peixe à esquerda | centro limpo | padrão geométrico à direita
 * Arcos no canto inferior esquerdo | sol/arcos no inferior direito
 *
 * Assets: public/ornament-*.png (extraídos da imagem de referência).
 */
export function BrandWatermarks({
  variant: _variant = "default",
  className,
}: Props) {
  void _variant;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden select-none",
        className,
      )}
    >
      {/* Peixe — grande, parcialmente cortado pela borda esquerda */}
      <img
        src="/ornament-fish.png"
        alt=""
        draggable={false}
        className={cn(
          "absolute -left-3 top-0 h-[min(58vh,28rem)] w-auto max-w-[46%] object-contain object-left-top sm:-left-4 sm:h-[min(62vh,32rem)] sm:max-w-[38%]",
          OPACITY,
        )}
      />

      {/* Padrão geométrico vertical — ornamental (não listra simples) */}
      <img
        src="/ornament-geo.png"
        alt=""
        draggable={false}
        className={cn(
          "absolute right-0 top-0 h-full min-h-[36rem] w-[4.75rem] object-cover object-top sm:w-[6rem]",
          OPACITY,
        )}
      />

      {/* Arcos concêntricos — canto inferior esquerdo (bem visíveis) */}
      <img
        src="/ornament-arcs-bl.png"
        alt=""
        draggable={false}
        className={cn(
          "absolute bottom-0 left-0 h-auto w-[min(78vw,24rem)] object-contain object-left-bottom sm:w-[min(52vw,28rem)]",
          OPACITY,
        )}
      />

      {/* Sol / arco com triângulos-raios — mais do círculo visível */}
      <img
        src="/ornament-sun-br.png"
        alt=""
        draggable={false}
        className={cn(
          "absolute bottom-0 right-0 h-auto w-[min(78vw,23rem)] object-contain object-right-bottom sm:w-[min(48vw,26rem)]",
          OPACITY,
        )}
      />
    </div>
  );
}
