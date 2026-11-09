import { cn } from "@/lib/utils";
import { countOccupied, vagasRestantes } from "@/lib/oficinas";
import type { InscricaoOficina, Oficina } from "@/types";

export function OficinaVagasBar({
  oficina,
  inscricoes,
  className,
}: {
  oficina: Oficina;
  inscricoes: InscricaoOficina[];
  className?: string;
}) {
  const ocupadas = countOccupied(inscricoes, oficina.id);
  if (oficina.total_vagas <= 0) {
    return (
      <p className={cn("text-sm font-medium text-navy", className)}>
        Vagas ilimitadas
      </p>
    );
  }
  const rest = vagasRestantes(oficina, ocupadas) ?? 0;
  const pct = Math.min(100, Math.round((ocupadas / oficina.total_vagas) * 100));
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-navy">
        {rest} de {oficina.total_vagas} vagas disponíveis
      </p>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-navy/10"
        role="progressbar"
        aria-valuenow={ocupadas}
        aria-valuemin={0}
        aria-valuemax={oficina.total_vagas}
        aria-label="Ocupação de vagas"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#e2c57a] to-[#c99a38] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
