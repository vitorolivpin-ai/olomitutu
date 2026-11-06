import type { UserRole } from "@/types";
import { roleLabel } from "@/lib/permissions";

/** Contas demo — uma por área (senha única do MVP) */
export const DEMO_ACCOUNTS: Record<
  UserRole,
  { email: string; label: string; hint: string }
> = {
  pai_de_santo: {
    email: "pai@ileoloroke.demo",
    label: "App da Casa",
    hint: "Acesso do Pai de Santo",
  },
  cliente: {
    email: "cliente@ileoloroke.demo",
    label: "App do Cliente",
    hint: "Cliente de jogo. Filho de Santo demo: filho@ileoloroke.demo",
  },
  administrador: {
    email: "admin@ileoloroke.demo",
    label: "Administrador",
    hint: "Visão completa da casa",
  },
  tesouraria: {
    email: "tesouraria@ileoloroke.demo",
    label: "Financeiro",
    hint: "Mensalidades e despesas",
  },
  estoque: {
    email: "estoque@ileoloroke.demo",
    label: "Estoque",
    hint: "Entrada e baixa por código de barras",
  },
  biblioteca: {
    email: "biblioteca@ileoloroke.demo",
    label: "Biblioteca",
    hint: "Vídeos, cantigas e PDFs",
  },
};

export const AREA_ROLES: UserRole[] = [
  "pai_de_santo",
  "cliente",
  "administrador",
  "tesouraria",
  "estoque",
  "biblioteca",
];

export function isAreaRole(value: string): value is UserRole {
  return (AREA_ROLES as string[]).includes(value);
}

export function areaTitle(role: UserRole) {
  return DEMO_ACCOUNTS[role]?.label ?? roleLabel(role);
}
