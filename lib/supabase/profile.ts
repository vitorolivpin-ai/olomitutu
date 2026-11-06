import type { SupabaseClient } from "@supabase/supabase-js";
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

const PROFILE_SELECT_FULL =
  "id, full_name, email, role, phone, client_id, avatar_url, requested_role, approval_status, person_kind, signup_area, created_at, updated_at";

/** Sem colunas da migration 014 — se o banco ainda não tiver person_kind. */
const PROFILE_SELECT_BASE =
  "id, full_name, email, role, phone, client_id, avatar_url, requested_role, approval_status, created_at, updated_at";

const PROFILE_SELECT_MIN = "id, full_name, email, role, created_at, updated_at";

export type FetchProfileResult = {
  row: ProfileRow | null;
  errorMessage?: string;
};

/** Lê o perfil; tenta várias formas (RLS / colunas / RPC). */
export async function fetchProfileRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const result = await fetchProfileRowDetailed(supabase, userId);
  return result.row;
}

export async function fetchProfileRowDetailed(
  supabase: SupabaseClient,
  userId: string,
): Promise<FetchProfileResult> {
  const errors: string[] = [];

  for (const columns of [PROFILE_SELECT_FULL, PROFILE_SELECT_BASE, PROFILE_SELECT_MIN]) {
    const { data, error } = await supabase
      .from("profiles")
      .select(columns)
      .eq("id", userId)
      .maybeSingle();
    if (!error && data && typeof data === "object" && "id" in data) {
      return { row: data as unknown as ProfileRow };
    }
    if (error) errors.push(error.message);
  }

  // RPC security definer (migration 015) — bypassa RLS problemático
  const rpc = await supabase.rpc("get_own_profile");
  if (!rpc.error && rpc.data) {
    const raw = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (raw && typeof raw === "object" && "id" in (raw as object)) {
      return { row: raw as unknown as ProfileRow };
    }
  }
  if (rpc.error) errors.push(rpc.error.message);

  return {
    row: null,
    errorMessage: errors.filter(Boolean).slice(0, 2).join(" | ") || undefined,
  };
}

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
  const cleaned =
    authProfile.role === "cliente"
      ? others
      : others.filter(
          (p) => !(p.role === authProfile.role && p.email.endsWith(".demo")),
        );
  return [authProfile, ...cleaned];
}
