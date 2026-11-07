import { cn } from "@/lib/utils";

type Variant = "home" | "biblioteca" | "default" | "faint";

type Props = {
  variant?: Variant;
  className?: string;
};

/** Dourado bege da referência — não cinza, não quase-branco. */
const INK = "#D6AE66";

/**
 * Opacidade única no SVG (nunca no container + stroke juntos).
 * Mobile ~28%, desktop ~34% — claramente percebido; sem competir com o conteúdo.
 */
const OPACITY =
  "opacity-[0.28] sm:opacity-[0.34]";

/**
 * Grafismos de fundo (line art dourada) — identidade global.
 * Extremidades só; centro limpo. z-0 atrás do conteúdo (z-10).
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
      {/* Peixe grande — vertical, cabeça para cima, sangrando na esquerda */}
      <svg
        viewBox="0 0 200 420"
        className={cn(
          "absolute -left-14 top-2 h-[22rem] w-[11.5rem] sm:-left-16 sm:top-4 sm:h-[26rem] sm:w-[13.5rem]",
          OPACITY,
        )}
        fill="none"
        stroke={INK}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Corpo (metade esquerda fora do frame) */}
        <path d="M-20 210 C10 120, 70 55, 155 72 C148 140, 150 210, 162 278 C95 300, 28 275, -20 210 Z" />
        {/* Escamas em U */}
        <path d="M40 155 C55 148, 70 148, 82 155" />
        <path d="M55 178 C72 170, 90 170, 105 178" />
        <path d="M35 200 C52 192, 72 192, 88 200" />
        <path d="M50 222 C68 214, 90 214, 108 222" />
        <path d="M38 245 C55 237, 75 237, 92 245" />
        <path d="M58 268 C75 260, 95 260, 112 268" />
        {/* Nadadeira dorsal */}
        <path d="M95 95 C115 55, 145 48, 165 70 C148 88, 125 95, 95 95 Z" />
        <path d="M112 78 L128 62" />
        <path d="M125 85 L142 68" />
        <path d="M138 90 L152 78" />
        {/* Nadadeira caudal (direita / baixo) */}
        <path d="M-20 210 C-55 165, -62 130, -35 105 C-18 140, -12 175, -20 210 Z" />
        <path d="M-20 210 C-52 250, -58 290, -30 318 C-14 280, -10 245, -20 210 Z" />
        {/* Olho */}
        <circle cx="148" cy="118" r="5.5" />
        <circle cx="148" cy="118" r="2.2" fill={INK} stroke="none" />
        {/* Linha da boca / guelra */}
        <path d="M130 140 C140 148, 145 160, 142 175" />
      </svg>

      {/* Pontos + losango — canto superior esquerdo */}
      <svg
        viewBox="0 0 24 72"
        className={cn("absolute left-3 top-3 h-14 w-5 sm:left-5 sm:top-5", OPACITY)}
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
      >
        <circle cx="12" cy="8" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="22" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="36" r="2.2" fill={INK} stroke="none" />
        <path d="M12 48 L18 56 L12 64 L6 56 Z" />
      </svg>

      {/* Pontos + losango — canto superior direito (acima do grafismo) */}
      <svg
        viewBox="0 0 24 72"
        className={cn("absolute right-4 top-3 h-14 w-5 sm:right-6 sm:top-5", OPACITY)}
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
      >
        <circle cx="12" cy="8" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="22" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="36" r="2.2" fill={INK} stroke="none" />
        <path d="M12 48 L18 56 L12 64 L6 56 Z" />
      </svg>

      {/* Grafismo geométrico vertical — encostado na direita */}
      <svg
        viewBox="0 0 110 520"
        className={cn(
          "absolute -right-1 top-0 h-full min-h-[36rem] w-[4.75rem] sm:w-[6rem]",
          OPACITY,
        )}
        fill="none"
        stroke={INK}
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        preserveAspectRatio="xMaxYMid slice"
      >
        {Array.from({ length: 14 }).map((_, i) => {
          const y = 16 + i * 36;
          return (
            <g key={i}>
              <path d={`M8 ${y + 28} L55 ${y} L102 ${y + 28}`} />
              <path d={`M20 ${y + 28} L55 ${y + 10} L90 ${y + 28}`} />
              <path d={`M32 ${y + 28} L55 ${y + 18} L78 ${y + 28}`} />
            </g>
          );
        })}
      </svg>

      {/* Arcos concêntricos — canto inferior esquerdo (sangrando) */}
      <svg
        viewBox="0 0 300 220"
        className={cn(
          "absolute -bottom-20 -left-20 h-56 w-80 sm:-bottom-24 sm:-left-24 sm:h-64 sm:w-[22rem]",
          OPACITY,
        )}
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M-20 220 A170 170 0 0 1 300 220" />
        <path d="M18 220 A132 132 0 0 1 262 220" />
        <path d="M52 220 A98 98 0 0 1 228 220" />
      </svg>

      {/* Pontos + losango — acima dos arcos esquerdos */}
      <svg
        viewBox="0 0 24 72"
        className={cn(
          "absolute bottom-36 left-4 h-14 w-5 sm:bottom-44 sm:left-6",
          OPACITY,
        )}
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
      >
        <circle cx="12" cy="8" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="22" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="36" r="2.2" fill={INK} stroke="none" />
        <path d="M12 48 L18 56 L12 64 L6 56 Z" />
      </svg>

      {/* Semicírculo + triângulos (sol) — canto inferior direito */}
      <svg
        viewBox="0 0 280 200"
        className={cn(
          "absolute -bottom-16 -right-16 h-52 w-72 sm:-bottom-20 sm:-right-20 sm:h-60 sm:w-80",
          OPACITY,
        )}
        fill="none"
        stroke={INK}
        strokeWidth="1.55"
        strokeLinejoin="round"
      >
        <path d="M-10 200 A150 150 0 0 0 290 200" />
        <path d="M28 200 A112 112 0 0 0 252 200" />
        {/* Triângulos no arco externo (como na referência) */}
        <path d="M48 125 L36 102 L62 108 Z" fill={INK} stroke="none" />
        <path d="M78 82 L70 56 L96 68 Z" fill={INK} stroke="none" />
        <path d="M118 48 L118 20 L140 42 Z" fill={INK} stroke="none" />
        <path d="M158 32 L168 6 L182 34 Z" fill={INK} stroke="none" />
        <path d="M198 42 L218 18 L222 48 Z" fill={INK} stroke="none" />
        <path d="M236 72 L262 52 L252 84 Z" fill={INK} stroke="none" />
        <path d="M258 118 L284 108 L268 136 Z" fill={INK} stroke="none" />
      </svg>

      {/* Pontos + losango — acima do sol direito */}
      <svg
        viewBox="0 0 24 72"
        className={cn(
          "absolute bottom-40 right-8 h-14 w-5 sm:bottom-48 sm:right-10",
          OPACITY,
        )}
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
      >
        <circle cx="12" cy="8" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="22" r="2.2" fill={INK} stroke="none" />
        <circle cx="12" cy="36" r="2.2" fill={INK} stroke="none" />
        <path d="M12 48 L18 56 L12 64 L6 56 Z" />
      </svg>
    </div>
  );
}
