import { cn } from "@/lib/utils";
import { modalidadeBadgeClass } from "@/lib/oficinas";
import type { OficinaModalidade, OficinaStatus } from "@/types";

export function OficinaModalidadeBadge({
  modalidade,
  status,
  className,
}: {
  modalidade: OficinaModalidade;
  status?: OficinaStatus;
  className?: string;
}) {
  const label = status === "Em breve" ? "Em breve" : modalidade;
  const tone = status === "Em breve" ? "Em breve" : modalidade;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        modalidadeBadgeClass(tone),
        className,
      )}
    >
      {label}
    </span>
  );
}
