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
  UserRound,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
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

const FEATURE_CARDS = [
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
    id: "filho",
    label: "Filho de Santo",
    href: "/entrar/filho",
    icon: UserRound,
  },
] as const;

/**
 * Home alinhada ao mockup: logo → nome → boas-vindas → CTA → grade 2×2 → nav.
 * Perfil reabre o menu de áreas (rotas existentes).
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
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#f5f6f8]">
      {/* Marca d’água suave no canto (como no mockup) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(212,160,23,0.18)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-6 top-16 h-28 w-28 rounded-full border border-gold/15"
      />

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-28 pt-12">
        <header className="animate-rise flex flex-col items-center text-center">
          <BrandMark
            className="hub-emblem h-[7.5rem] w-[7.5rem] sm:h-36 sm:w-36"
            priority
            blendOnLight
          />
          <h1 className="mt-3 font-display text-[1.85rem] font-semibold leading-tight tracking-wide text-navy sm:text-4xl">
            ILÉ OLÓRÒKÈ ÀṢẸ
          </h1>
          <p className="mt-1 font-display text-base tracking-wide text-gold-deep sm:text-lg">
            OLÓMÌ TÚTÙ
          </p>

          <div className="mt-6 space-y-1">
            <p className="text-[15px] font-semibold text-navy">Bem-vindo(a)!</p>
            <p className="text-sm text-navy/45">O que você deseja fazer hoje?</p>
          </div>
        </header>

        <a
          href="/marcar"
          className="animate-rise mt-6 flex w-full items-center gap-3.5 rounded-[18px] bg-[#e4d2a0] px-4 py-3.5 text-navy shadow-[0_8px_24px_rgba(11,31,58,0.08)] transition hover:bg-[#ebd9ad] active:scale-[0.99]"
          style={{ animationDelay: "50ms" }}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-navy text-cream">
            <CalendarDays className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="flex-1 text-left text-[17px] font-semibold tracking-tight">
            Marcar horário
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-navy/45" strokeWidth={2} />
        </a>

        <div
          className="animate-rise mt-4 grid grid-cols-2 gap-3"
          style={{ animationDelay: "100ms" }}
        >
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.id}
                href={card.href}
                className="relative flex min-h-[8.25rem] flex-col items-start rounded-[18px] bg-white px-4 pb-4 pt-4 shadow-[0_8px_24px_rgba(11,31,58,0.06)] ring-1 ring-black/[0.03] transition hover:shadow-[0_10px_28px_rgba(11,31,58,0.1)] active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef2f6] text-navy">
                  <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.75} />
                </span>
                <span className="mt-3 pr-5 text-[15px] font-semibold leading-snug text-navy">
                  {card.label}
                </span>
                <ChevronRight
                  className="absolute bottom-3.5 right-3.5 h-4 w-4 text-navy/30"
                  strokeWidth={2}
                />
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
                  active ? "text-navy" : "text-navy/35 hover:text-navy/60",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "text-gold-deep")}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className={cn(active && "font-semibold text-navy")}>
                  {item.label}
                </span>
                {active ? (
                  <span className="absolute bottom-0.5 h-0.5 w-6 rounded-full bg-gold" />
                ) : null}
              </a>
            );
          })}

          <button
            type="button"
            onClick={() => setPerfilOpen(true)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium transition",
              perfilOpen ? "text-navy" : "text-navy/35 hover:text-navy/60",
            )}
          >
            <UserRound
              className={cn("h-5 w-5", perfilOpen && "text-gold-deep")}
              strokeWidth={perfilOpen ? 2.25 : 1.75}
            />
            <span className={cn(perfilOpen && "font-semibold text-navy")}>Perfil</span>
            {perfilOpen ? (
              <span className="absolute bottom-0.5 h-0.5 w-6 rounded-full bg-gold" />
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
                  Conta do cliente e acessos da casa
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
