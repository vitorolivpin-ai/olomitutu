import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "md" | "lg" | "sm";
};

export function Button({
  className,
  variant = "primary",
  size = "lg",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        size === "lg" && "min-h-12 px-5 text-base",
        size === "md" && "min-h-10 px-4 text-sm",
        size === "sm" && "min-h-9 px-3 text-sm",
        variant === "primary" && "bg-navy text-white shadow-soft hover:bg-navy-mid",
        variant === "gold" && "bg-gold text-navy shadow-soft hover:bg-gold-soft",
        variant === "secondary" && "bg-white text-navy border border-navy/15 hover:bg-cream",
        variant === "ghost" && "bg-transparent text-navy hover:bg-navy/5",
        variant === "danger" && "bg-danger text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}
