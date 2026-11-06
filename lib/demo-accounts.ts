import type { UserRole } from "@/types";
import { roleLabel } from "@/lib/permissions";

/**
 * Slug da aba no hub (/entrar/[area], /cadastrar/[area]).
 * `filho` não é UserRole: autentica como `cliente` + person_kind filho_de_santo.
 */
export type AreaSlug = UserRole | "filho";

/** Contas demo — uma por área (senha única do MVP) */
export const DEMO_ACCOUNTS: Record<
  AreaSlug,
  { email: string; label: string; hint: string }
> = {
  pai_de_santo: {
    email: "pai@ileoloroke.demo",
    label: "App da Casa",
    hint: "Acesso do Pai de Santo",
  },
  filho: {
    email: "filho@ileoloroke.demo",
    label: "Filho de Santo",
    hint: "Mensalidade, educação, ajodun e chat",
  },
  cliente: {
    email: "cliente@ileoloroke.demo",
    label: "App do Cliente",
    hint: "Marcação aberta em /marcar (sem conta)",
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

export const AREA_SLUGS: AreaSlug[] = [
  "pai_de_santo",
  "filho",
  "cliente",
  "administrador",
  "tesouraria",
  "estoque",
  "biblioteca",
];

/** @deprecated Use AREA_SLUGS — mantido para refs antigas. */
export const AREA_ROLES = AREA_SLUGS;

export function isAreaRole(value: string): value is AreaSlug {
  return (AREA_SLUGS as string[]).includes(value);
}

/** Papel Auth/profiles.role usado na aba. */
export function authRoleForArea(area: AreaSlug): UserRole {
  if (area === "filho") return "cliente";
  return area;
}

export function isFilhoArea(area: string) {
  return area === "filho";
}

export function areaTitle(area: AreaSlug | UserRole) {
  return DEMO_ACCOUNTS[area as AreaSlug]?.label ?? roleLabel(area as UserRole);
}
