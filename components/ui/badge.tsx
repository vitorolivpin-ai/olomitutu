import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/20 text-amber-800 border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/20",
  info: "bg-navy/10 text-navy border-navy/10",
  gold: "bg-gold/20 text-navy border-gold/30",
  muted: "bg-slate-100 text-slate-600 border-slate-200",
};

export function Badge({
  children,
  tone = "info",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function feeStatusTone(status: string): keyof typeof tones {
  if (status === "PAGO" || status === "PAGA" || status === "REALIZADO") return "success";
  if (status === "VENCIDO" || status === "VENCIDA" || status === "CANCELADO" || status === "NAO_COMPARECEU")
    return "danger";
  if (status === "AGUARDANDO" || status === "EM_ABERTO" || status === "SOLICITADO" || status === "CONFIRMADO")
    return "warning";
  if (status === "EM_ATENDIMENTO") return "gold";
  return "muted";
}
