"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ShoppingBag, UserRound, X } from "lucide-react";
import type { HubEntry } from "@/components/hub/hub-landing";
import { HUB_ENTRIES } from "@/lib/hub-entries";
import { cn } from "@/lib/utils";

type Props = {
  entries?: HubEntry[];
};

/**
 * Nav inferior pública da Home / Acervo / páginas abertas:
 * Início | Agenda | Loja | Perfil
 */
export function PublicBottomNav({ entries = HUB_ENTRIES }: Props) {
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
    <>
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
    </>
  );
}
