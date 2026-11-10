import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, GraduationCap } from "lucide-react";
import { OficinaModalidadeBadge } from "@/components/oficinas/oficina-badge";
import {
  countOccupied,
  formatOficinaDate,
  formatOficinaHorario,
  vagasLabel,
} from "@/lib/oficinas";
import { cn } from "@/lib/utils";
import type { InscricaoOficina, Oficina } from "@/types";

export function OficinaCard({
  oficina,
  inscricoes,
}: {
  oficina: Oficina;
  inscricoes: InscricaoOficina[];
}) {
  const ocupadas = countOccupied(inscricoes, oficina.id);
  const vagas = vagasLabel(oficina, ocupadas);

  return (
    <Link
      href={`/oficinas/${oficina.id}`}
      className="flex w-full max-w-full items-stretch gap-3 rounded-[18px] bg-card p-3 shadow-[0_6px_18px_rgba(11,50,107,0.06)] ring-1 ring-navy/[0.04] transition active:scale-[0.99]"
    >
      <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-2xl bg-mist">
        {oficina.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={oficina.imagem}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-navy/35">
            <GraduationCap className="h-8 w-8" strokeWidth={1.6} />
          </span>
        )}
        <span className="absolute left-1.5 top-1.5">
          <OficinaModalidadeBadge
            modalidade={oficina.modalidade}
            status={oficina.status}
          />
        </span>
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-navy">
          {oficina.titulo}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-navy/50">
          {oficina.descricao_curta}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-navy/55">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatOficinaDate(oficina.data)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatOficinaHorario(oficina.hora_inicio, oficina.hora_fim)}
          </span>
        </div>
        <p
          className={cn(
            "mt-1.5 text-[11px] font-semibold",
            vagas.tone === "warn" && "text-[#b88720]",
            vagas.tone === "full" && "text-danger",
            (vagas.tone === "ok" || vagas.tone === "unlimited") && "text-navy/55",
          )}
        >
          {vagas.text}
        </p>
      </div>

      <ChevronRight
        className="mt-1 h-5 w-5 shrink-0 self-center text-navy/35"
        strokeWidth={2}
        aria-hidden
      />
    </Link>
  );
}
