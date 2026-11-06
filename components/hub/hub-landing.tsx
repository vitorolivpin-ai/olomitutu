import { BookOpen, Menu, ShoppingBag, X } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";

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

/**
 * Hub: emblema + atalhos.
 * Menu usa <details> nativo (abre sem depender de React onClick).
 * Quem somos e entradas usam navegação real (href).
 */
export function HubLanding({ entries }: Props) {
  const gerais = entries.filter((e) => e.section !== "restrito");
  const restritos = entries.filter((e) => e.section === "restrito");

  return (
    <div className="bg-app relative min-h-screen">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 pb-8 pt-14">
        <div className="animate-rise flex flex-1 flex-col items-center justify-center text-center">
          <BrandMark
            className="hub-emblem h-44 w-44 sm:h-56 sm:w-56 md:h-64 md:w-64"
            priority
          />
          <h1 className="mt-8 font-display text-4xl font-semibold tracking-wide text-navy sm:text-5xl md:text-6xl">
            ILÉ OLÓRÒKÈ ÀṢẸ
          </h1>
          <p className="mt-2 font-display text-xl text-gold-deep sm:text-2xl md:text-3xl">
            OLÓMÌ TÚTÙ
          </p>
        </div>

        <div className="flex flex-wrap items-start justify-center gap-6 pb-4 pt-6 sm:gap-8">
          <a
            href="/historia"
            className="group flex w-[4.75rem] flex-col items-center gap-2 sm:w-20"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-navy shadow-soft ring-1 ring-navy/10 transition group-hover:bg-white group-hover:ring-gold/40 sm:h-16 sm:w-16">
              <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
            </span>
            <span className="text-center text-[11px] leading-tight text-navy/70 sm:text-xs">
              Quem somos
            </span>
          </a>

          <a
            href="/vitrine"
            className="group flex w-[4.75rem] flex-col items-center gap-2 sm:w-20"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-navy shadow-soft ring-1 ring-navy/10 transition group-hover:bg-white group-hover:ring-gold/40 sm:h-16 sm:w-16">
              <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
            </span>
            <span className="text-center text-[11px] leading-tight text-navy/70 sm:text-xs">
              Loja
            </span>
          </a>

          {/* details/summary = abre no browser sem JS de React */}
          <details className="group relative w-[4.75rem] sm:w-20">
            <summary className="flex cursor-pointer list-none flex-col items-center gap-2 [&::-webkit-details-marker]:hidden">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-cream shadow-soft transition group-open:bg-cream group-open:text-navy sm:h-16 sm:w-16">
                <Menu className="h-6 w-6 group-open:hidden sm:h-7 sm:w-7" strokeWidth={1.75} />
                <X className="hidden h-6 w-6 group-open:block sm:h-7 sm:w-7" strokeWidth={1.75} />
              </span>
              <span className="text-center text-[11px] leading-tight text-navy/70 sm:text-xs">
                Menu
              </span>
            </summary>

            <div className="absolute bottom-[calc(100%+0.75rem)] left-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-navy/10 bg-navy text-cream shadow-soft">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="font-display text-sm tracking-wide text-gold">Menu</p>
                <p className="text-xs text-cream/50">Escolha por onde entrar</p>
              </div>

              <nav className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto px-2 py-3">
                <div>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/40">
                    Geral
                  </p>
                  <ul className="space-y-0.5">
                    {gerais.map((entry) => (
                      <li key={entry.id}>
                        <a
                          href={entry.href}
                          className="block rounded-xl px-3 py-3 transition hover:bg-white/10 active:bg-white/15"
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
          </details>
        </div>
      </main>
    </div>
  );
}
