import type { UserRole } from "@/types";

export function homePathForRole(role: UserRole | null | undefined) {
  if (role === "cliente") return "/cliente";
  if (role === "estoque") return "/estoque";
  if (role === "biblioteca") return "/biblioteca";
  return "/inicio";
}

export function isClientPortalPath(pathname: string) {
  return pathname === "/cliente" || pathname.startsWith("/cliente/");
}

export function isMemberPortalPath(pathname: string) {
  return (
    isClientPortalPath(pathname) ||
    pathname === "/filho" ||
    pathname.startsWith("/filho/")
  );
}
