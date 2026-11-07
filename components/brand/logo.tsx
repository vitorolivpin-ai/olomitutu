import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brasão oficial (PNG transparente) — ILÉ OLÓRÒKÈ ÀṢẸ / OLÓMÌ TÚTÙ
 */
export function BrandMark({
  className,
  priority = false,
  /** @deprecated fundo preto já removido no brasao.png */
  blendOnLight = false,
}: {
  className?: string;
  priority?: boolean;
  blendOnLight?: boolean;
}) {
  void blendOnLight;
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-transparent shadow-none ring-0",
        className,
      )}
    >
      <Image
        src="/brasao-designer.png"
        alt="ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ"
        fill
        priority={priority}
        unoptimized
        className="object-contain"
        sizes="(max-width: 768px) 240px, 320px"
        style={{ background: "transparent", mixBlendMode: "normal" }}
      />
    </div>
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
