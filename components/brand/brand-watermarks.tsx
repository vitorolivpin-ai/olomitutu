import { cn } from "@/lib/utils";

type Variant = "home" | "biblioteca" | "default";

type Props = {
  variant?: Variant;
  className?: string;
};

/**
 * Marcas d’água em traço fino (bege/dourado claro) — identidade visual da Home.
 * Sempre atrás do conteúdo; pointer-events: none.
 */
export function BrandWatermarks({ variant = "default", className }: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Peixe — lateral esquerda */}
      <svg
        viewBox="0 0 120 200"
        className={cn(
          "absolute text-[#c9a227]",
          variant === "biblioteca"
            ? "left-[-1.25rem] top-16 h-44 w-24 opacity-[0.09]"
            : "left-[-1.5rem] top-10 h-40 w-24 opacity-[0.1]",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path d="M18 100c28-34 58-48 88-42-8 18-10 36-2 54-30 8-58-2-86-12z" />
        <path d="M106 58c8 10 10 24 4 38" />
        <circle cx="92" cy="78" r="2.2" fill="currentColor" stroke="none" />
        <path d="M22 92c-10 4-16 12-16 20 6-2 12-4 18-8" />
        <path d="M48 118c12 8 28 10 42 4" opacity="0.7" />
      </svg>

      {/* Padrão geométrico vertical — direita */}
      <svg
        viewBox="0 0 80 280"
        className={cn(
          "absolute text-[#c9a227]",
          variant === "biblioteca"
            ? "right-[-0.5rem] top-28 h-56 w-16 opacity-[0.08]"
            : "right-[-0.75rem] top-20 h-52 w-14 opacity-[0.09]",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      >
        {[0, 36, 72, 108, 144, 180, 216].map((y) => (
          <path key={y} d={`M12 ${y + 28} L40 ${y + 8} L68 ${y + 28}`} />
        ))}
        <path d="M40 8 V248" opacity="0.45" />
      </svg>

      {/* Arcos inferiores */}
      <svg
        viewBox="0 0 220 140"
        className="absolute bottom-[-2.5rem] left-[-2rem] h-36 w-52 text-[#c9a227] opacity-[0.08]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <circle cx="70" cy="140" r="58" />
        <circle cx="70" cy="140" r="42" />
        <circle cx="70" cy="140" r="26" />
      </svg>
      <svg
        viewBox="0 0 220 140"
        className="absolute bottom-[-2rem] right-[-2.5rem] h-32 w-48 text-[#c9a227] opacity-[0.07]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <circle cx="150" cy="140" r="64" />
        <circle cx="150" cy="140" r="46" />
        <circle cx="150" cy="140" r="28" />
      </svg>

      {variant === "home" ? (
        <div className="absolute right-8 top-20 h-28 w-28 rounded-full border border-[#c9a227]/15 opacity-80" />
      ) : null}
    </div>
  );
}
