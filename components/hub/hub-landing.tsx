import {
  BookOpen,
  CalendarDays,
  Library,
  Menu,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
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
 * Hub: emblema + atalhos públicos bem visíveis + menu para o restante.
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

        {/* Atalhos públicos — balões maiores para leitura no celular */}
        <div className="flex flex-wrap items-start justify-center gap-6 pb-3 pt-6 sm:gap-8">
          <a
            href="/marcar"
            className="group flex w-[6.5rem] flex-col items-center gap-2.5 sm:w-28"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/25 text-navy shadow-soft ring-1 ring-gold/40 transition group-hover:bg-gold/40 sm:h-24 sm:w-24">
              <CalendarDays className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.75} />
            </span>
            <span className="text-center text-sm font-medium leading-tight text-navy sm:text-base">
              Marcar
              <span className="mt-0.5 block text-xs font-normal text-navy/55 sm:text-sm">
                horário
              </span>
            </span>
          </a>

          <a
            href="/acervo"
            className="group flex w-[6.5rem] flex-col items-center gap-2.5 sm:w-28"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-navy shadow-soft ring-1 ring-navy/10 transition group-hover:bg-white group-hover:ring-gold/40 sm:h-24 sm:w-24">
              <Library className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.75} />
            </span>
            <span className="text-center text-sm font-medium leading-tight text-navy sm:text-base">
              Biblioteca
            </span>
          </a>

          <a
            href="/vitrine"
            className="group flex w-[6.5rem] flex-col items-center gap-2.5 sm:w-28"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-navy shadow-soft ring-1 ring-navy/10 transition group-hover:bg-white group-hover:ring-gold/40 sm:h-24 sm:w-24">
              <ShoppingBag className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.75} />
            </span>
            <span className="text-center text-sm font-medium leading-tight text-navy sm:text-base">
              Loja
            </span>
          </a>

          <a
            href="/historia"
            className="group flex w-[6.5rem] flex-col items-center gap-2.5 sm:w-28"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-navy shadow-soft ring-1 ring-navy/10 transition group-hover:bg-white group-hover:ring-gold/40 sm:h-24 sm:w-24">
              <BookOpen className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.75} />
            </span>
            <span className="text-center text-sm font-medium leading-tight text-navy sm:text-base">
              Quem somos
            </span>
          </a>

          <a
            href="/entrar/filho"
            className="group flex w-[6.5rem] flex-col items-center gap-2.5 sm:w-28"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/30 text-navy shadow-soft ring-1 ring-gold/50 transition group-hover:bg-gold/45 sm:h-24 sm:w-24">
              <Users className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.75} />
            </span>
            <span className="text-center text-sm font-medium leading-tight text-navy sm:text-base">
              Filho
              <span className="mt-0.5 block text-xs font-normal text-navy/55 sm:text-sm">
                de Santo
              </span>
            </span>
          </a>

          <details className="group relative w-[6.5rem] sm:w-28">
            <summary className="flex cursor-pointer list-none flex-col items-center gap-2.5 [&::-webkit-details-marker]:hidden">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-cream shadow-soft transition group-open:bg-cream group-open:text-navy sm:h-24 sm:w-24">
                <Menu className="h-9 w-9 group-open:hidden sm:h-10 sm:w-10" strokeWidth={1.75} />
                <X className="hidden h-9 w-9 group-open:block sm:h-10 sm:w-10" strokeWidth={1.75} />
              </span>
              <span className="text-center text-sm font-medium leading-tight text-navy sm:text-base">
                Menu
              </span>
            </summary>

            <div className="absolute bottom-[calc(100%+0.75rem)] left-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-navy/10 bg-navy text-cream shadow-soft">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="font-display text-sm tracking-wide text-gold">Menu</p>
                <p className="text-xs text-cream/50">Aberto ao público e áreas da casa</p>
              </div>

              <nav className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto px-2 py-3">
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
