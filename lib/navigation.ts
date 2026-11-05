import type { UserRole } from "@/types";

export function homePathForRole(role: UserRole | null | undefined) {
  if (role === "cliente") return "/cliente";
  if (role === "estoque") return "/estoque";
  if (role === "biblioteca") return "/biblioteca";
  // Casa: Quem Somos como aba principal + traços de entrada
  return "/inicio";
}

export function isClientPortalPath(pathname: string) {
  return pathname === "/cliente" || pathname.startsWith("/cliente/");
}
