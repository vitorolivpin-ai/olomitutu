import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
};

/**
 * Loading leve de rota — sem brasão.
 * A Splash com brasão só aparece no boot inicial (#boot-splash).
 */
export function RouteLoading({
  className,
  label = "Carregando…",
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-dvh items-center justify-center bg-background px-6",
        className,
      )}
      role="status"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-pulse rounded-full bg-gold/50" />
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
