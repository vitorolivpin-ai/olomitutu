import type { AreaSlug } from "@/lib/demo-accounts";
import { authRoleForArea, isFilhoArea } from "@/lib/demo-accounts";
import type { PersonKind, Profile, UserRole } from "@/types";

export const VIEW_AS_COOKIE = "ile-oloroke-view-as";
export const VIEW_AS_STORAGE_KEY = "ile-oloroke-view-as";
/** Cliente local só para o Pai navegar o portal do cliente/filho sem outra conta. */
export const PAI_VIEW_CLIENT_ID = "cli_view_as_pai";

export function isPaiDeSantoRole(role: UserRole | null | undefined) {
  return role === "pai_de_santo";
}

/** Conta do Pai de Santo pode abrir qualquer aba com o mesmo e-mail/senha. */
export function paiCanOpenArea(profileRole: UserRole | null | undefined) {
  return isPaiDeSantoRole(profileRole);
}

function readViewAsFromDocumentCookie(): AreaSlug | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${VIEW_AS_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(VIEW_AS_COOKIE.length + 1)) as AreaSlug;
}

export function readViewAsArea(): AreaSlug | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VIEW_AS_STORAGE_KEY);
    if (raw) return raw as AreaSlug;
    const fromCookie = readViewAsFromDocumentCookie();
    if (fromCookie) {
      window.localStorage.setItem(VIEW_AS_STORAGE_KEY, fromCookie);
      return fromCookie;
    }
    return null;
  } catch {
    return readViewAsFromDocumentCookie();
  }
}

export function writeViewAsArea(area: AreaSlug | null) {
  if (typeof window === "undefined") return;
  try {
    if (!area || area === "pai_de_santo") {
      window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
      document.cookie = `${VIEW_AS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
      return;
    }
    window.localStorage.setItem(VIEW_AS_STORAGE_KEY, area);
    document.cookie = `${VIEW_AS_COOKIE}=${encodeURIComponent(area)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function viewAsFromCookieHeader(cookieHeader: string | null): AreaSlug | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${VIEW_AS_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(VIEW_AS_COOKIE.length + 1));
  return value as AreaSlug;
}

/**
 * Perfil efetivo para UI: Pai mantém id/e-mail reais, mas assume o papel da aba.
 */
export function actingProfileForArea(
  profile: Profile,
  area: AreaSlug | null | undefined,
): Profile {
  if (!area || area === "pai_de_santo" || !paiCanOpenArea(profile.role)) {
    return profile;
  }

  const role = authRoleForArea(area);
  let person_kind: PersonKind | undefined = profile.person_kind;

  if (isFilhoArea(area)) {
    person_kind = "filho_de_santo";
  } else if (area === "cliente") {
    person_kind = "cliente";
  } else if (role !== "cliente") {
    person_kind = undefined;
  }

  const needsClient = role === "cliente";

  return {
    ...profile,
    role,
    person_kind,
    client_id: needsClient ? profile.client_id || PAI_VIEW_CLIENT_ID : profile.client_id,
    signup_area: area === "filho" ? "cliente" : role,
  };
}
