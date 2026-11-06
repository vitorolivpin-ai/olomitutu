import { defaultFeeAmountForFilho } from "@/lib/filho";
import { nowIso, uid } from "@/lib/utils";
import type { AppState, Member, Profile } from "@/types";

/** Garante Member financeiro ligado ao perfil do filho de santo. */
export function ensureFilhoMemberState(
  prev: AppState,
  profile: Pick<Profile, "id" | "full_name" | "email" | "phone" | "person_kind">,
): AppState {
  if (profile.person_kind !== "filho_de_santo") return prev;

  const linked = (prev.members ?? []).find((m) => m.profile_id === profile.id);
  if (linked) return prev;

  const stamp = nowIso();
  const email = profile.email?.toLowerCase();
  const byEmail = email
    ? (prev.members ?? []).find(
        (m) => m.email?.toLowerCase() === email && !m.profile_id,
      )
    : undefined;

  if (byEmail) {
    const patched: Member = {
      ...byEmail,
      profile_id: profile.id,
      email: byEmail.email ?? profile.email,
      phone: byEmail.phone || profile.phone || "a definir",
      checklist_level: byEmail.checklist_level ?? "abian",
      updated_at: stamp,
    };
    return {
      ...prev,
      members: prev.members.map((m) => (m.id === byEmail.id ? patched : m)),
    };
  }

  const created: Member = {
    id: uid("mem"),
    full_name: profile.full_name || profile.email || "Filho de Santo",
    phone: profile.phone || "a definir",
    email: profile.email,
    monthly_fee_amount: defaultFeeAmountForFilho(),
    due_day: 10,
    entry_date: stamp.slice(0, 10),
    status: "ativo",
    profile_id: profile.id,
    checklist_level: "abian",
    created_at: stamp,
    updated_at: stamp,
  };

  return { ...prev, members: [created, ...prev.members] };
}

export function memberForProfile(
  members: Member[] | undefined,
  profileId: string | null | undefined,
) {
  if (!profileId) return undefined;
  return (members ?? []).find((m) => m.profile_id === profileId);
}
