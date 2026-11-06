import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo oficial: ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ
 */
export function BrandMark({
  className,
  priority = false,
  /** Em fundo claro, remove o quadrado branco do JPG (multiply). */
  blendOnLight = false,
}: {
  className?: string;
  priority?: boolean;
  blendOnLight?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-transparent",
        blendOnLight && "isolate",
        className,
      )}
    >
      <Image
        src="/logo.jpg"
        alt="ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ"
        fill
        priority={priority}
        className={cn(
          "object-contain",
          blendOnLight && "mix-blend-multiply",
        )}
        sizes="(max-width: 768px) 160px, 200px"
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
