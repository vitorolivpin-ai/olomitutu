"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, Settings2, UserRound } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import { PAI_MODULE_GROUPS } from "@/lib/pai-modules";
import { unreadChatCountForRole } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Props = {
  onNavigate?: () => void;
};

const HOME = { href: "/inicio", label: "Início", icon: LayoutDashboard };
const ACCOUNT = [
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
  { href: "/menu", label: "Conta", icon: Settings2 },
];

/**
 * Menu lateral do Pai — ATENDIMENTO em destaque; demais grupos recolhíveis.
 */
export function PaiSidebarNav({ onNavigate }: Props) {
  const pathname = usePathname();
  const { currentUser, state } = useAppStore();
  const chatUnread = unreadChatCountForRole(state.notifications ?? [], currentUser?.role, {
    clientId: currentUser?.client_id,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    atendimento: true,
    gestao: false,
    financeiro: false,
    conteudo: false,
  });

  function isActive(href: string) {
    if (href === "/inicio") return pathname === "/inicio";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function toggle(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto p-3">
      <Link
        href={HOME.href}
        onClick={() => onNavigate?.()}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
          isActive(HOME.href)
            ? "bg-navy text-white shadow-soft"
            : "text-navy/70 hover:bg-navy/5",
        )}
      >
        <HOME.icon
          className={cn("h-5 w-5 shrink-0", isActive(HOME.href) ? "text-gold" : "text-gold-deep")}
        />
        {HOME.label}
      </Link>

      {PAI_MODULE_GROUPS.map((group) => {
        const open = openGroups[group.id] ?? group.id === "atendimento";
        const isAtendimento = group.id === "atendimento";
        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => toggle(group.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition hover:bg-navy/[0.03]",
                isAtendimento && "bg-gold/10",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.16em]",
                  isAtendimento ? "text-gold-deep" : "text-navy/40",
                )}
              >
                {group.label}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-navy/35 transition",
                  open && "rotate-180",
                )}
              />
            </button>

            {open ? (
              <ul className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const showBadge =
                    item.href === "/conversas" && chatUnread > 0 && !active;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => onNavigate?.()}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                          active
                            ? "bg-navy text-white shadow-soft"
                            : isAtendimento
                              ? "text-navy/80 hover:bg-gold/10"
                              : "text-navy/65 hover:bg-navy/5",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-gold" : "text-gold-deep",
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="flex-1 leading-snug">{item.label}</span>
                        {showBadge ? (
                          <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">
                            {chatUnread > 9 ? "9+" : chatUnread}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}

      <div>
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy/40">
          Conta
        </p>
        <ul className="space-y-0.5">
          {ACCOUNT.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-navy text-white shadow-soft"
                      : "text-navy/65 hover:bg-navy/5",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-gold" : "text-gold-deep",
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
