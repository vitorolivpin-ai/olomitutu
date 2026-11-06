import type { PersonKind, UserRole } from "@/types";

export type ApprovalStatus = "pending" | "approved" | "rejected";

/** Abas com formulário completo (nome, sobrenome, tipo). */
export const HOUSE_SIGNUP_ROLES: UserRole[] = [
  "administrador",
  "tesouraria",
  "estoque",
  "biblioteca",
];

export function isHouseSignupRole(role: UserRole) {
  return HOUSE_SIGNUP_ROLES.includes(role);
}

/** Áreas que precisam de aceite do Pai de Santo (ou Admin). */
export function roleNeedsApproval(role: UserRole) {
  return role !== "cliente";
}

/** Aba Filho de Santo também espera aceite (mesmo role cliente no banco). */
export function areaNeedsApproval(area: string) {
  if (area === "filho") return true;
  if (area === "cliente") return false;
  return true;
}

export function approvalLabel(status: ApprovalStatus) {
  if (status === "pending") return "Aguardando aprovação";
  if (status === "rejected") return "Cadastro recusado";
  return "Aprovado";
}

export const PERSON_KIND_OPTIONS: { value: PersonKind; label: string }[] = [
  { value: "filho_de_santo", label: "Filho de Santo" },
  { value: "cliente", label: "Cliente" },
  { value: "administrador", label: "Administrador" },
];

export function personKindLabel(kind: PersonKind | null | undefined) {
  if (!kind) return "—";
  return PERSON_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

/**
 * Papel liberado quando o Pai aceita.
 * A aba de cadastro (requested_role / signup_area) define o acesso —
 * person_kind é só informação para o Pai (Filho de Santo / Cliente / Admin).
 */
export function roleGrantedOnApproval(input: {
  requested_role: UserRole;
  signup_area?: UserRole | null;
  person_kind?: PersonKind | null;
}): UserRole {
  const fromTab = input.signup_area ?? input.requested_role;
  if (fromTab && fromTab !== "cliente") return fromTab;
  // Cadastro pelo App do Cliente: person_kind administrador → admin; demais → cliente
  if (input.person_kind === "administrador") return "administrador";
  return "cliente";
}

/** @deprecated Preferir roleGrantedOnApproval — mantido para refs antigas. */
export function roleFromPersonKind(kind: PersonKind): UserRole {
  if (kind === "administrador") return "administrador";
  return "cliente";
}
