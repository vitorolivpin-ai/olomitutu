import type { ReactNode } from "react";
import { BrandWatermarks } from "@/components/brand/brand-watermarks";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Conteúdo central mais largo (formulários). */
  wide?: boolean;
};

/**
 * Moldura padrão de login / cadastro / recuperação de senha.
 */
export function AuthPageFrame({ children, className, wide = false }: Props) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-background px-4 py-10">
      <BrandWatermarks />
      <div
        className={cn(
          "relative z-10 w-full animate-rise space-y-5",
          wide ? "max-w-md" : "max-w-md",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
