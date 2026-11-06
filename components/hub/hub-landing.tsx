"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Home,
  Library,
  ShoppingBag,
  Swords,
  UserRound,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { CLIENT_WHATSAPP, openWhatsApp } from "@/lib/client-whatsapp";
import { cn } from "@/lib/utils";

export type HubEntry = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  section?: "geral" | "restrito";
};

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
  const pathname = usePathname();
  const [perfilOpen, setPerfilOpen] = useState(false);

  const gerais = useMemo(
    () => entries.filter((e) => e.section !== "restrito"),
    [entries],
  );
  const restritos = useMemo(
    () => entries.filter((e) => e.section === "restrito"),
    [entries],
  );

  const navItems = [
    {
      id: "inicio",
      label: "Início",
      href: "/",
      icon: Home,
      match: (p: string) => p === "/",
    },
    {
      id: "agenda",
      label: "Agenda",
      href: "/marcar",
      icon: CalendarDays,
      match: (p: string) => p === "/marcar" || p.startsWith("/marcar/"),
    },
    {
      id: "loja",
      label: "Loja",
      href: "/vitrine",
      icon: ShoppingBag,
      match: (p: string) => p === "/vitrine" || p.startsWith("/vitrine/"),
    },
  ] as const;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#f3f4f6]">
      {/* Marcas d’água suaves (peixe / sol) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-8 h-40 w-40 opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse at center, #c9a227 0%, transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-24 h-48 w-48 rounded-full border-[18px] border-[#d4a017]/[0.08]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -left-6 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(212,160,23,0.1)_0%,transparent_70%)]"
      />

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
            background: "linear-gradient(90deg, #e8d39a 0%, #d4b56a 55%, #c9a24a 100%)",
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

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/[0.06] bg-white"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium transition",
                  active ? "text-gold-deep" : "text-navy/40 hover:text-navy/65",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className={cn(active && "font-semibold")}>{item.label}</span>
                {active ? (
                  <span className="absolute bottom-0.5 h-0.5 w-7 rounded-full bg-gold" />
                ) : null}
              </a>
            );
          })}

          <button
            type="button"
            onClick={() => setPerfilOpen(true)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium transition",
              perfilOpen ? "text-gold-deep" : "text-navy/40 hover:text-navy/65",
            )}
          >
            <UserRound className="h-5 w-5" strokeWidth={perfilOpen ? 2.25 : 1.75} />
            <span className={cn(perfilOpen && "font-semibold")}>Perfil</span>
            {perfilOpen ? (
              <span className="absolute bottom-0.5 h-0.5 w-7 rounded-full bg-gold" />
            ) : null}
          </button>
        </div>
      </nav>

      {perfilOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40"
            aria-label="Fechar"
            onClick={() => setPerfilOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-t-3xl bg-navy text-cream shadow-soft sm:mx-4 sm:rounded-3xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-perfil-title"
          >
            <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p
                  id="hub-perfil-title"
                  className="font-display text-lg tracking-wide text-gold"
                >
                  Perfil e áreas
                </p>
                <p className="text-xs text-cream/50">
                  Filho de Santo, Cliente e acessos da casa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPerfilOpen(false)}
                className="rounded-full p-2 text-cream/70 transition hover:bg-white/10 hover:text-cream"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto px-3 py-4">
              <div>
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/40">
                  Público
                </p>
                <ul className="space-y-0.5">
                  {gerais.map((entry) => (
                    <li key={entry.id}>
                      <a
                        href={entry.href}
                        className="block rounded-xl px-3 py-3 transition hover:bg-white/10 active:bg-white/15"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <span className="font-display text-base text-cream">
                          {entry.label}
                        </span>
                        {entry.hint ? (
                          <span className="mt-0.5 block text-xs text-cream/55">
                            {entry.hint}
                          </span>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {restritos.length > 0 ? (
                <div>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/40">
                    Restrito
                  </p>
                  <ul className="space-y-0.5">
                    {restritos.map((entry) => (
                      <li key={entry.id}>
                        <a
                          href={entry.href}
                          className="block rounded-xl px-3 py-3 transition hover:bg-white/10 active:bg-white/15"
                          onClick={() => setPerfilOpen(false)}
                        >
                          <span className="font-display text-base text-cream">
                            {entry.label}
                          </span>
                          {entry.hint ? (
                            <span className="mt-0.5 block text-xs text-cream/55">
                              {entry.hint}
                            </span>
                          ) : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
