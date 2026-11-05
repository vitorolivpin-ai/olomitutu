import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-medium text-navy/80 mb-1.5", className)} {...props} />
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full min-h-12 rounded-2xl border border-navy/15 bg-white px-4 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-navy/15 bg-white px-4 py-3 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full min-h-12 rounded-2xl border border-navy/15 bg-white px-4 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
