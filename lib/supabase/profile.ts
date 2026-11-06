import type { Profile, UserRole } from "@/types";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  client_id?: string | null;
  avatar_url?: string | null;
  requested_role?: UserRole | null;
  approval_status?: Profile["approval_status"] | null;
  person_kind?: Profile["person_kind"] | null;
  signup_area?: UserRole | null;
  created_at?: string;
  updated_at?: string;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    phone: row.phone ?? undefined,
    client_id: row.client_id ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    requested_role: row.requested_role ?? undefined,
    approval_status: row.approval_status ?? undefined,
    person_kind: row.person_kind ?? undefined,
    signup_area: row.signup_area ?? undefined,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

/** Insere ou substitui o perfil Auth na lista local (seed + usuário real). */
export function mergeAuthProfile(profiles: Profile[], authProfile: Profile): Profile[] {
  const others = profiles.filter((p) => p.id !== authProfile.id);
  // Remove contas demo da mesma área para a UI refletir o usuário real
  const cleaned =
    authProfile.role === "cliente"
      ? others
      : others.filter(
          (p) => !(p.role === authProfile.role && p.email.endsWith(".demo")),
        );
  return [authProfile, ...cleaned];
}
