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
  | "shop"
  | "oficinas";

/** Acesso completo — só Pai de Santo. */
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
  "oficinas",
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

/**
 * Matriz por perfil:
 * - Pai: tudo
 * - Admin: gestão dos filhos (avisos, hierarquia/função, ajodun) + loja
 * - Financeiro: finanças + loja
 * - Estoque: só estoque
 * - Biblioteca: biblioteca / conteúdo
 */
const ROLE_ACCESS: Record<UserRole, AppModule[]> = {
  pai_de_santo: [...HOUSE_FULL_MODULES],
  administrador: [
    "dashboard",
    "members",
    "notifications",
    "house_content",
    "shop",
    "oficinas",
    "workshops",
    "certificates",
  ],
  tesouraria: [
    "dashboard",
    "members",
    "fees",
    "charges",
    "expenses",
    "finance",
    "notifications",
    "shop",
    "reports",
  ],
  estoque: ["stock", "notifications"],
  biblioteca: ["library", "notifications", "house_content"],
  /** Cliente: marcação + chat + cursos (portal próprio). */
  cliente: ["dashboard", "chat", "notifications", "agenda"],
};

/** Quem pode publicar / apagar materiais da biblioteca */
export function canManageLibrary(role: UserRole | null | undefined) {
  return (
    role === "pai_de_santo" ||
    role === "administrador" ||
    role === "biblioteca"
  );
}

/** Quem edita Quem Somos, Educação, Hierarquia, Checklist, Ajodun e Fotos */
export function canManageHouseContent(role: UserRole | null | undefined) {
  return (
    role === "pai_de_santo" ||
    role === "administrador" ||
    role === "biblioteca"
  );
}

/** Quem gerencia Oficinas (criar, editar, inscritos) */
export function canManageOficinas(role: UserRole | null | undefined) {
  return role === "pai_de_santo" || role === "administrador";
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
  if (role === "pai_de_santo") return "App da Casa";
  if (role === "administrador") return "App do Administrador";
  if (role === "tesouraria") return "App Financeiro";
  if (role === "estoque") return "App do Estoque";
  if (role === "biblioteca") return "App da Biblioteca";
  return "App da Casa";
}
