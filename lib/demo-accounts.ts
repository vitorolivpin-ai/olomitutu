import type { UserRole } from "@/types";
import { roleLabel } from "@/lib/permissions";
import { DEMO_PASSWORD, createSeedState } from "@/lib/seed";

/**
 * Slug da aba no hub (/entrar/[area], /cadastrar/[area]).
 * `filho` não é UserRole: autentica como `cliente` + person_kind filho_de_santo.
 */
export type AreaSlug = UserRole | "filho";

/** Sessão local seed quando o Preview tem Supabase mas a conta demo não existe no Auth. */
export const DEMO_OVERRIDE_KEY = "ile-oloroke-demo-override";

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
    hint: "Cursos liberados, agenda e chat — marcação sem conta em /marcar",
  },
  administrador: {
    email: "admin@ileoloroke.demo",
    label: "Administrador",
    hint: "Gestão dos filhos, avisos, ajodun e loja",
  },
  tesouraria: {
    email: "tesouraria@ileoloroke.demo",
    label: "Financeiro",
    hint: "Mensalidades, cobranças, despesas e loja",
  },
  estoque: {
    email: "estoque@ileoloroke.demo",
    label: "Estoque",
    hint: "Entrada e saída por código de barras",
  },
  biblioteca: {
    email: "biblioteca@ileoloroke.demo",
    label: "Biblioteca",
    hint: "Vídeos, cantigas e PDFs da casa",
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

export function isDemoPassword(password: string) {
  return password === DEMO_PASSWORD;
}

/** Resolve perfil seed pelo e-mail demo (Preview local). */
export function findSeedProfileByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return createSeedState().profiles.find((p) => p.email.toLowerCase() === normalized) ?? null;
}

export function readDemoOverrideId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(DEMO_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

export function writeDemoOverrideId(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!userId) sessionStorage.removeItem(DEMO_OVERRIDE_KEY);
    else sessionStorage.setItem(DEMO_OVERRIDE_KEY, userId);
  } catch {
    // ignore
  }
}

export function isDemoOverrideActive() {
  return Boolean(readDemoOverrideId());
}
