"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, MapPin, Monitor, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dateBadge,
  formatTimeRange,
  MODALITY_LABEL,
  publicState,
  spotsLabel,
  type SpotInfo,
} from "@/lib/workshops";
import type { Workshop } from "@/types";

export function WorkshopImage({ workshop, className }: { workshop: Workshop; className?: string }) {
  if (workshop.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={workshop.image_url}
        alt=""
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
      />
    );
  }
  // Arte padrão no estilo do app (sem foto cadastrada)
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-navy to-[#14457f]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-30">
        <g fill="none" stroke="#c99a38" strokeWidth="1">
          <circle cx="50" cy="50" r="16" />
          <circle cx="50" cy="50" r="26" />
          <circle cx="50" cy="50" r="36" />
        </g>
      </svg>
      <span className="relative font-display text-3xl text-gold">
        {workshop.title.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function StatusPill({ workshop, spots }: { workshop: Workshop; spots: SpotInfo }) {
  const st = publicState(workshop, spots);
  const tone =
    st === "aberta"
      ? "bg-success/12 text-success"
      : st === "ultimas"
        ? "bg-gold/20 text-gold-deep"
        : st === "em_breve"
          ? "bg-navy/8 text-navy/70"
          : "bg-danger/10 text-danger";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      <Users className="h-3.5 w-3.5" />
      {spotsLabel(workshop, spots)}
    </span>
  );
}

export function WorkshopCard({
  workshop,
  spots,
  href,
}: {
  workshop: Workshop;
  spots: SpotInfo;
  href: string;
}) {
  const badge = dateBadge(workshop.date);
  const time = formatTimeRange(workshop);
  return (
    <Link
      href={href}
      className="group flex items-stretch gap-3 rounded-3xl border border-navy/8 bg-card p-3 shadow-soft transition hover:border-gold/40 active:scale-[0.99]"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28">
        <WorkshopImage workshop={workshop} />
        {badge ? (
          <span className="absolute left-1.5 top-1.5 flex flex-col items-center rounded-xl bg-white/95 px-2 py-1 leading-none text-navy shadow">
            <span className="font-display text-lg font-semibold">{badge.day}</span>
            <span className="text-[10px] font-bold tracking-wider text-gold-deep">{badge.month}</span>
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug text-navy">{workshop.title}</h3>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-navy/30 transition group-hover:text-gold-deep" />
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-navy/65">{workshop.short_description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-navy/60">
          <span className="inline-flex items-center gap-1">
            {workshop.modality === "online" ? (
              <Monitor className="h-3.5 w-3.5" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {MODALITY_LABEL[workshop.modality]}
          </span>
          {time ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {time}
            </span>
          ) : null}
          {!workshop.date ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Data a definir
            </span>
          ) : null}
        </div>
        <div className="mt-2">
          <StatusPill workshop={workshop} spots={spots} />
        </div>
      </div>
    </Link>
  );
}
