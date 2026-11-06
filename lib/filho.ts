import type { PersonKind, Profile } from "@/types";
import { homePathForRole } from "@/lib/navigation";

export function isFilhoDeSanto(
  user: Pick<Profile, "role" | "person_kind"> | null | undefined,
) {
  return user?.role === "cliente" && user.person_kind === "filho_de_santo";
}

export function isClienteDeJogo(
  user: Pick<Profile, "role" | "person_kind"> | null | undefined,
) {
  return (
    user?.role === "cliente" &&
    (!user.person_kind || user.person_kind === "cliente")
  );
}

export function homePathForUser(
  user: Pick<Profile, "role" | "person_kind"> | null | undefined,
) {
  if (isFilhoDeSanto(user)) return "/filho";
  return homePathForRole(user?.role);
}

export function isFilhoPortalPath(pathname: string) {
  return pathname === "/filho" || pathname.startsWith("/filho/");
}

export function portalBaseForUser(
  user: Pick<Profile, "role" | "person_kind"> | null | undefined,
) {
  return isFilhoDeSanto(user) ? "/filho" : "/cliente";
}

/** Rótulo da área no header / menu. */
export function portalLabelForUser(
  user: Pick<Profile, "role" | "person_kind"> | null | undefined,
) {
  if (isFilhoDeSanto(user)) return "App do Filho de Santo";
  if (user?.role === "cliente") return "App do Cliente";
  return null;
}

export function personKindFromSignup(
  kind: PersonKind | null | undefined,
): PersonKind | undefined {
  return kind ?? undefined;
}

export function defaultFeeAmountForFilho() {
  return 80;
}
