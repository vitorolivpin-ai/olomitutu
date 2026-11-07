import { cn } from "@/lib/utils";

/** ?v= força refresh quando o SW/browser ainda guarda o PNG antigo */
export const BRASAO_SRC = "/brasao-olomi-tutu.png?v=2";
export const BRASAO_ALT = "Brasão Ilé Olóròkè Àṣẹ Olómi Tútù";

/**
 * Brasão oficial (PNG transparente com contorno branco).
 * - `hero`: tamanho grande responsivo (hub / destaque).
 * - sem hero: respeita `className` (ex.: sidebar), com sombra suave.
 */
export function BrandMark({
  className,
  priority = false,
  hero = false,
  /** @deprecated mantido por compatibilidade */
  blendOnLight = false,
}: {
  className?: string;
  priority?: boolean;
  /** Destaque na home — min(65vw, 320px) + sombra */
  hero?: boolean;
  blendOnLight?: boolean;
}) {
  void blendOnLight;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG transparente precisa de controle direto de filter/tamanho
    <img
      src={BRASAO_SRC}
      alt={BRASAO_ALT}
      width={1024}
      height={1024}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "block bg-transparent object-contain opacity-100",
        hero ? "brand-brasao-hero" : "h-full w-full max-h-full max-w-full",
        className,
      )}
      style={
        hero
          ? undefined
          : {
              filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25))",
              mixBlendMode: "normal",
              opacity: 1,
            }
      }
    />
  );
}

export function BrandTitle({
  compact = false,
  className,
  showSubtitle = true,
}: {
  compact?: boolean;
  className?: string;
  showSubtitle?: boolean;
}) {
  return (
    <div className={cn(className)}>
      <p
        className={cn(
          "font-display font-semibold tracking-wide text-navy",
          compact ? "text-sm" : "text-lg sm:text-xl",
        )}
      >
        ILÉ OLÓRÒKÈ ÀṢẸ
      </p>
      <p
        className={cn(
          "font-display text-gold-deep",
          compact ? "text-xs" : "text-sm sm:text-base",
        )}
      >
        OLÓMÌ TÚTÙ
      </p>
      {!compact && showSubtitle ? (
        <p className="mt-1 text-xs text-navy/55">Gestão e organização do barracão</p>
      ) : null}
    </div>
  );
}
