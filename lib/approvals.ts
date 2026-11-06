import type { UserRole } from "@/types";

export type ApprovalStatus = "pending" | "approved" | "rejected";

/** Áreas que precisam de aceite do Pai de Santo (ou Admin). */
export function roleNeedsApproval(role: UserRole) {
  return role !== "cliente";
}

export function approvalLabel(status: ApprovalStatus) {
  if (status === "pending") return "Aguardando aprovação";
  if (status === "rejected") return "Cadastro recusado";
  return "Aprovado";
}
