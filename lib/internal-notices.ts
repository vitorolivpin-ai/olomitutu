import type {
  InternalNoticePriority,
  InternalNoticeStatus,
  InternalSector,
  Profile,
  UserRole,
} from "@/types";

export const INTERNAL_SECTORS: Array<{ value: InternalSector; label: string }> = [
  { value: "administracao", label: "Administração" },
  { value: "pai_de_santo", label: "Pai de Santo" },
  { value: "financeiro", label: "Financeiro" },
  { value: "estoque", label: "Estoque" },
  { value: "biblioteca", label: "Biblioteca" },
];

export const NOTICE_PRIORITY_LABEL: Record<InternalNoticePriority, string> = {
  normal: "Normal",
  importante: "Importante",
  urgente: "Urgente",
};

export const NOTICE_STATUS_LABEL: Record<InternalNoticeStatus, string> = {
  novo: "Novo",
  visualizado: "Visualizado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  arquivado: "Arquivado",
  rascunho: "Rascunho",
  publicado: "Publicado",
  expirado: "Expirado",
};

const ROLE_SECTOR: Partial<Record<UserRole, InternalSector>> = {
  administrador: "administracao",
  pai_de_santo: "pai_de_santo",
  tesouraria: "financeiro",
  estoque: "estoque",
  biblioteca: "biblioteca",
};

export function sectorForRole(role: UserRole | null | undefined) {
  return role ? ROLE_SECTOR[role] ?? null : null;
}

export function sectorLabel(sector: InternalSector | null | undefined) {
  return INTERNAL_SECTORS.find((item) => item.value === sector)?.label ?? "Setor";
}

export function isChildProfile(profile: Profile | null | undefined) {
  return profile?.role === "cliente" && profile.person_kind === "filho_de_santo";
}

export function canCreateSectorRequest(profile: Profile | null | undefined) {
  return Boolean(profile && sectorForRole(profile.role));
}

export function canCreateChildrenAnnouncement(profile: Profile | null | undefined) {
  return profile?.role === "administrador";
}