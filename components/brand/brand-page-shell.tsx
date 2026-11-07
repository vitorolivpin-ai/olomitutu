import type { ReactNode } from "react";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { PublicBottomNav } from "@/components/hub/public-bottom-nav";
import { cn } from "@/lib/utils";
import type { HubEntry } from "@/lib/hub-entries";

type Props = {
  children: ReactNode;
  /** Exibe a nav inferior pública (Início | Agenda | Loja | Perfil). */
  showBottomNav?: boolean;
  entries?: HubEntry[];
  watermarkVariant?: "home" | "biblioteca" | "default";
  className?: string;
  mainClassName?: string;
  maxWidth?: "sm" | "md" | "lg";
};

const maxW = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

/**
 * Casca visual padrão das páginas públicas: fundo #F7F8FA + grafismos + safe area.
 */
export function BrandPageShell({
  children,
  showBottomNav = true,
  entries,
  watermarkVariant = "default",
  className,
  mainClassName,
  maxWidth = "md",
}: Props) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col overflow-x-hidden bg-[#F7F8FA]",
        className,
      )}
    >
      <BrandWatermarks variant={watermarkVariant} />
      <main
        className={cn(
          "relative z-10 mx-auto flex w-full flex-1 flex-col px-5 pt-5 sm:px-6",
          maxW[maxWidth],
          showBottomNav ? "pb-28" : "pb-8",
          mainClassName,
        )}
      >
        {children}
      </main>
      {showBottomNav ? <PublicBottomNav entries={entries} /> : null}
    </div>
  );
}
