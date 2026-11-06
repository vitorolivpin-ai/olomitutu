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

const ROLE_ACCESS: Record<UserRole, AppModule[]> = {
  administrador: [
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
    "chat",
  ],
  /** Pai: todas as abas da casa (sem o portal /cliente e /filho). */
  pai_de_santo: [
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
  ],
  /** App dedicado do estoque (entrada/saída por código de barras) */
  estoque: ["stock", "notifications"],
  /** App dedicado da biblioteca (vídeos, cantigas, PDFs) */
  biblioteca: ["library", "notifications", "house_content"],
  /** Cliente: Quem somos + cadastro + chat + horários + loja + biblioteca */
  cliente: ["dashboard", "chat", "notifications", "agenda", "shop", "library"],
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
  if (role === "estoque") return "App do Estoque";
  if (role === "biblioteca") return "App da Biblioteca";
  return "App da Casa";
}
