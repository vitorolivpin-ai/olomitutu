"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Library,
  ShoppingBag,
  Swords,
} from "lucide-react";
import { BrandPageShell } from "@/components/brand/brand-page-shell";
import { CLIENT_WHATSAPP, openWhatsApp } from "@/lib/client-whatsapp";
import type { HubEntry } from "@/lib/hub-entries";

export type { HubEntry };

type Props = {
  entries: HubEntry[];
};

type FeatureCard = {
  id: string;
  label: string;
  icon: typeof Library;
  href?: string;
  external?: "whatsapp-grupo";
};

const FEATURE_CARDS: FeatureCard[] = [
  { id: "biblioteca", label: "Biblioteca", href: "/acervo", icon: Library },
  { id: "loja", label: "Loja", href: "/vitrine", icon: ShoppingBag },
  { id: "historia", label: "Quem somos", href: "/historia", icon: BookOpen },
  {
    id: "grupo",
    label: "Grupo com Ogun Yande",
    icon: Swords,
    external: "whatsapp-grupo",
  },
];

export function HubLanding({ entries }: Props) {
  return (
    <BrandPageShell watermarkVariant="home" entries={entries} mainClassName="pt-4 sm:pt-6">
      <header className="animate-rise flex flex-col items-center px-0 text-center">
        <div className="space-y-1.5">
          <p className="text-[19px] font-bold leading-tight text-navy sm:text-[21px]">
            Bem-vindo(a)!
          </p>
          <p className="text-[14px] text-muted sm:text-[15px]">
            O que você deseja fazer hoje?
          </p>
        </div>
      </header>

      <Link
        href="/marcar"
        prefetch
        className="animate-rise mt-7 flex w-full items-center gap-3.5 rounded-[18px] px-4 py-4 text-navy shadow-[0_8px_22px_rgba(11,31,58,0.1)] transition active:scale-[0.99]"
        style={{
          animationDelay: "40ms",
          background:
            "linear-gradient(90deg, #e2c57a 0%, #d4ad4f 50%, #c99a38 100%)",
        }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-navy/20">
          <CalendarDays className="h-6 w-6 text-navy" strokeWidth={2.1} />
        </span>
        <span className="flex-1 text-left text-[17px] font-bold tracking-tight text-navy">
          Marcar horário
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-navy/55" strokeWidth={2.25} />
      </Link>

      <div
        className="animate-rise mt-4 grid grid-cols-2 gap-3.5"
        style={{ animationDelay: "90ms" }}
      >
        {FEATURE_CARDS.map((card) => {
          const Icon = card.icon;
          const className =
            "relative flex min-h-[9rem] flex-col items-center justify-center gap-3 rounded-[18px] bg-card px-3 pb-5 pt-5 text-center shadow-[0_6px_18px_rgba(11,50,107,0.06)] ring-1 ring-navy/[0.04] transition active:scale-[0.99]";
          const inner = (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mist text-navy">
                <Icon className="h-6 w-6" strokeWidth={1.85} />
              </span>
              <span className="max-w-[10rem] text-[15px] font-semibold leading-snug text-navy">
                {card.label}
              </span>
              <ChevronRight
                className="absolute bottom-3.5 right-3.5 h-4 w-4 text-muted"
                strokeWidth={2}
              />
            </>
          );
          if (card.external === "whatsapp-grupo") {
            return (
              <button
                key={card.id}
                type="button"
                className={className}
                onClick={() => openWhatsApp(CLIENT_WHATSAPP.grupo.href)}
              >
                {inner}
              </button>
            );
          }
          return (
            <Link key={card.id} href={card.href!} prefetch className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </BrandPageShell>
  );
}
