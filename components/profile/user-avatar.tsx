"use client";

import { initialsFromName } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  src?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-lg",
  lg: "h-28 w-28 text-3xl",
};

export function UserAvatar({ name, src, className, size = "md" }: Props) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover ring-2 ring-gold/40",
          sizes[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-navy font-display font-semibold text-gold ring-2 ring-gold/30",
        sizes[size],
        className,
      )}
      aria-label={name}
    >
      {initialsFromName(name)}
    </div>
  );
}
