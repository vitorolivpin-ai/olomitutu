"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { PAI_MODULE_GROUPS } from "@/lib/pai-modules";
import { canAccess } from "@/lib/permissions";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  role: UserRole | null | undefined;
};

/**
 * Painel com todos os módulos do Pai, organizados por categoria.
 */
export function PaiModulesSheet({ open, onClose, role }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(88vh,40rem)] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-soft sm:mx-4 sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pai-modules-title"
      >
        <div className="flex items-start justify-between border-b border-navy/10 px-5 py-4">
          <div>
            <h2 id="pai-modules-title" className="font-display text-xl text-navy">
              Todos os módulos
            </h2>
            <p className="text-xs text-navy/50">Acesso completo à casa</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-navy/50 transition hover:bg-navy/5 hover:text-navy"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {PAI_MODULE_GROUPS.map((group) => {
            const items = group.items.filter(
              (item) => !item.module || canAccess(role, item.module),
            );
            if (items.length === 0) return null;
            return (
              <div key={group.id}>
                <p
                  className={cn(
                    "mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    group.id === "atendimento" ? "text-gold-deep" : "text-navy/40",
                  )}
                >
                  {group.label}
                </p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-navy/75 transition hover:bg-navy/[0.04] hover:text-navy"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.75} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
