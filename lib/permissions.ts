import type { UserRole } from "@/types";

export type AppModule =
  | "dashboard"
  | "members"
  | "fees"
  | "charges"
  | "expenses"
  | "finance"
  | "clients"
  | "agenda"
  | "chat"
  | "reports"
  | "notifications"
  | "internal_notes"
  | "stock"
  | "library"
  | "house_content"
  | "shop";

/** Mesmo acesso da aba Pai de Santo — todas as áreas da casa. */
export const HOUSE_FULL_MODULES: AppModule[] = [
  "dashboard",
  "members",
  "fees",
  "charges",
  "expenses",
  "finance",
  "clients",
  "agenda",
  "chat",
  "reports",
  "notifications",
  "internal_notes",
  "stock",
  "library",
  "house_content",
  "shop",
];

/** Papéis da casa (não Cliente / Filho). */
export function isHouseStaffRole(role: UserRole | null | undefined) {
  return (
    role === "pai_de_santo" ||
    role === "administrador" ||
    role === "tesouraria" ||
    role === "estoque" ||
    role === "biblioteca"
  );
}

const ROLE_ACCESS: Record<UserRole, AppModule[]> = {
  administrador: [...HOUSE_FULL_MODULES],
  tesouraria: [...HOUSE_FULL_MODULES],
  pai_de_santo: [...HOUSE_FULL_MODULES],
  estoque: [...HOUSE_FULL_MODULES],
  biblioteca: [...HOUSE_FULL_MODULES],
  /** Cliente: marcação + chat + cursos (portal próprio). */
  cliente: ["dashboard", "chat", "notifications", "agenda"],
};

/** Quem pode publicar / apagar materiais da biblioteca */
export function canManageLibrary(role: UserRole | null | undefined) {
  return isHouseStaffRole(role);
}

/** Quem edita Quem Somos, Educação, Hierarquia, Checklist, Ajodun e Fotos */
export function canManageHouseContent(role: UserRole | null | undefined) {
  return isHouseStaffRole(role);
}

export function canAccess(role: UserRole | null | undefined, module: AppModule) {
  if (!role) return false;
  return ROLE_ACCESS[role].includes(module);
}

export function roleLabel(role: UserRole) {
  const map: Record<UserRole, string> = {
    administrador: "Administrador",
    tesouraria: "Financeiro",
    pai_de_santo: "Pai de Santo",
    estoque: "Estoque",
    biblioteca: "Biblioteca",
    cliente: "Cliente",
  };
  return map[role];
}

export function appLabelForRole(role: UserRole | null | undefined) {
  if (role === "cliente") return "App do Cliente";
  if (isHouseStaffRole(role)) return "App da Casa";
  return "App da Casa";
}
