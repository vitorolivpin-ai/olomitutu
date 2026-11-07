import { cn } from "@/lib/utils";

type Variant = "home" | "biblioteca" | "default" | "faint";

type Props = {
  variant?: Variant;
  className?: string;
};

/**
 * Grafismos em line art (bege/dourado ~12–15% opacidade) — identidade global.
 * Variante `faint` (~7–9%) para áreas operacionais (ex.: Home do Pai).
 * Sempre atrás do conteúdo; pointer-events: none.
 */
export function BrandWatermarks({ variant = "default", className }: Props) {
  const ink = "#c4a35a";
  const faint = variant === "faint";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden select-none",
        className,
      )}
    >
      {/* Peixe grande — esquerda */}
      <svg
        viewBox="0 0 180 320"
        className={cn(
          "absolute -left-10 top-6 h-[19rem] w-[11rem] opacity-[0.14] sm:h-[22rem] sm:w-[13rem]",
          variant === "biblioteca" && "top-14 opacity-[0.13]",
          variant === "home" && "opacity-[0.15]",
          faint && "opacity-[0.08] sm:opacity-[0.09]",
        )}
        fill="none"
        stroke={ink}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M28 168 C52 110, 98 78, 148 92 C138 128, 140 168, 152 198 C104 210, 58 198, 28 168 Z" />
        <path d="M48 160 C78 128, 112 118, 138 128" opacity="0.85" />
        <path d="M52 176 C84 188, 118 186, 142 172" opacity="0.7" />
        <path d="M28 168 C8 148, 4 128, 14 112 C22 136, 18 152, 28 168 Z" />
        <path d="M28 168 C10 188, 6 210, 18 224 C24 198, 22 180, 28 168 Z" />
        <path d="M96 118 C108 98, 128 92, 142 102 C128 112, 112 118, 96 118 Z" />
        <path d="M90 196 C102 214, 122 220, 138 210 C122 200, 106 198, 90 196 Z" />
        <circle cx="132" cy="128" r="3.2" fill={ink} stroke="none" />
        <path d="M118 142 C126 148, 128 158, 124 168" />
        <path d="M110 146 C118 154, 120 164, 116 172" opacity="0.75" />
      </svg>

      {/* Padrão geométrico vertical — direita */}
      <svg
        viewBox="0 0 100 360"
        className={cn(
          "absolute -right-3 top-16 h-[22rem] w-[5.5rem] opacity-[0.13] sm:top-12 sm:h-[26rem] sm:w-28",
          faint && "opacity-[0.07]",
        )}
        fill="none"
        stroke={ink}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const y = 18 + i * 32;
          return (
            <g key={i}>
              <path d={`M18 ${y + 22} L50 ${y} L82 ${y + 22}`} />
              <path
                d={`M26 ${y + 22} L50 ${y + 8} L74 ${y + 22}`}
                opacity="0.65"
              />
            </g>
          );
        })}
        <path d="M50 8 V330" opacity="0.35" />
        <path d="M50 48 L62 60 L50 72 L38 60 Z" opacity="0.5" />
        <path d="M50 176 L64 190 L50 204 L36 190 Z" opacity="0.45" />
        <path d="M50 272 L60 282 L50 292 L40 282 Z" opacity="0.4" />
      </svg>

      {/* Arcos — canto inferior esquerdo */}
      <svg
        viewBox="0 0 280 200"
        className={cn(
          "absolute -bottom-16 -left-16 h-52 w-72 opacity-[0.13] sm:h-60 sm:w-80",
          faint && "opacity-[0.07]",
        )}
        fill="none"
        stroke={ink}
        strokeWidth="1.3"
      >
        <path d="M-10 200 A140 140 0 0 1 270 200" />
        <path d="M20 200 A110 110 0 0 1 240 200" />
        <path d="M50 200 A80 80 0 0 1 210 200" />
        <path d="M78 200 A52 52 0 0 1 182 200" />
      </svg>

      {/* Arcos / pontas — canto inferior direito */}
      <svg
        viewBox="0 0 260 200"
        className={cn(
          "absolute -bottom-14 -right-14 h-48 w-64 opacity-[0.12] sm:h-56 sm:w-72",
          faint && "opacity-[0.06]",
        )}
        fill="none"
        stroke={ink}
        strokeWidth="1.25"
        strokeLinejoin="round"
      >
        <path d="M-20 200 A150 150 0 0 0 280 200" />
        <path d="M10 200 A120 120 0 0 0 250 200" />
        <path d="M40 200 A90 90 0 0 0 220 200" />
        <path d="M70 148 L90 118 L110 148" opacity="0.8" />
        <path d="M110 138 L130 108 L150 138" opacity="0.75" />
        <path d="M150 148 L170 120 L190 148" opacity="0.7" />
        <path d="M80 168 L100 142 L120 168" opacity="0.55" />
        <path d="M140 168 L160 144 L180 168" opacity="0.5" />
      </svg>

      <svg
        viewBox="0 0 60 60"
        className={cn(
          "absolute right-10 top-10 h-14 w-14 opacity-[0.12]",
          faint && "opacity-[0.06]",
        )}
        fill="none"
        stroke={ink}
        strokeWidth="1.2"
      >
        <circle cx="30" cy="30" r="22" />
        <circle cx="30" cy="30" r="12" />
        <path d="M30 8 V18 M30 42 V52 M8 30 H18 M42 30 H52" />
      </svg>
      <svg
        viewBox="0 0 40 40"
        className={cn(
          "absolute bottom-36 left-8 h-9 w-9 opacity-[0.11]",
          faint && "opacity-[0.06]",
        )}
        fill="none"
        stroke={ink}
        strokeWidth="1.2"
      >
        <path d="M20 4 L36 20 L20 36 L4 20 Z" />
      </svg>
    </div>
  );
}
