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

/** Papel liberado quando o Pai aceita, conforme o tipo informado. */
export function roleFromPersonKind(kind: PersonKind): UserRole {
  if (kind === "administrador") return "administrador";
  // Filho de Santo e Cliente usam o portal de cliente
  return "cliente";
}
