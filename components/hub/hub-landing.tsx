"use client";

import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Library,
  ShoppingBag,
  Swords,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { PublicBottomNav } from "@/components/hub/public-bottom-nav";
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
  {
    id: "biblioteca",
    label: "Biblioteca",
    href: "/acervo",
    icon: Library,
  },
  {
    id: "loja",
    label: "Loja",
    href: "/vitrine",
    icon: ShoppingBag,
  },
  {
    id: "historia",
    label: "Quem somos",
    href: "/historia",
    icon: BookOpen,
  },
  {
    id: "grupo",
    label: "Grupo com Ogun Yande",
    icon: Swords,
    external: "whatsapp-grupo",
  },
];

/**
 * Home no formato do mockup:
 * logo → títulos → boas-vindas → Marcar horário → grade 2×2 → nav inferior.
 */
export function HubLanding({ entries }: Props) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#f3f4f6]">
      <BrandWatermarks variant="home" />

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-28 pt-11">
        <header className="animate-rise flex flex-col items-center text-center">
          <BrandMark
            className="hub-emblem h-[7.25rem] w-[7.25rem] sm:h-36 sm:w-36"
            priority
            blendOnLight
          />
          <p className="mt-2.5 text-[13px] font-semibold tracking-[0.04em] text-navy">
            ILÉ OLÓRÒKÈ ÀṢẸ
          </p>
          <p className="mt-0.5 font-display text-[1.65rem] font-semibold leading-none tracking-wide text-gold-deep sm:text-3xl">
            OLÓMÌ TÚTÙ
          </p>

          <div className="mt-7 space-y-1">
            <p className="text-[17px] font-bold text-navy">Bem-vindo(a)!</p>
            <p className="text-[14px] text-navy/50">
              O que você deseja fazer hoje?
            </p>
          </div>
        </header>

        <a
          href="/marcar"
          className="animate-rise mt-6 flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-navy shadow-[0_8px_22px_rgba(11,31,58,0.1)] transition active:scale-[0.99]"
          style={{
            animationDelay: "40ms",
            background:
              "linear-gradient(90deg, #e8d39a 0%, #d4b56a 55%, #c9a24a 100%)",
          }}
        >
          <CalendarDays className="h-6 w-6 shrink-0 text-navy" strokeWidth={2} />
          <span className="flex-1 text-left text-[16px] font-bold tracking-tight">
            Marcar horário
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-navy/55" strokeWidth={2.25} />
        </a>

        <div
          className="animate-rise mt-4 grid grid-cols-2 gap-3.5"
          style={{ animationDelay: "90ms" }}
        >
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            const className =
              "relative flex min-h-[8.5rem] flex-col items-center justify-center gap-2.5 rounded-[18px] bg-white px-3 pb-5 pt-5 text-center shadow-[0_6px_18px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03] transition active:scale-[0.99]";

            const inner = (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efe6d0] text-navy">
                  <Icon className="h-5 w-5" strokeWidth={1.85} />
                </span>
                <span className="max-w-[9.5rem] text-[14px] font-semibold leading-snug text-navy">
                  {card.label}
                </span>
                <ChevronRight
                  className="absolute bottom-3.5 right-3.5 h-4 w-4 text-navy/28"
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
              <a key={card.id} href={card.href} className={className}>
                {inner}
              </a>
            );
          })}
        </div>
      </main>

      <PublicBottomNav entries={entries} />
    </div>
  );
}
