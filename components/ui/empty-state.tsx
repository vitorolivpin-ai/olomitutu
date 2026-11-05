import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
  action,
}: {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-3xl border border-dashed border-navy/20 bg-white/60 p-8 text-center", className)}>
      <p className="font-display text-xl text-navy">{title}</p>
      {description ? <p className="mt-2 text-sm text-navy/65">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold/30 border-t-gold" />
        <p className="text-sm text-navy/70">{label}</p>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}
