import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InternalNotice,
  InternalNoticeHistoryEntry,
  InternalNoticePriority,
  InternalNoticeType,
  InternalSector,
} from "@/types";

export type CreateInternalNoticeInput = {
  notice_type: InternalNoticeType;
  title: string;
  body: string;
  target_sector?: InternalSector;
  priority: InternalNoticePriority;
  due_at?: string;
  starts_at?: string;
  expires_at?: string;
  publish?: boolean;
};

export async function fetchInternalNotices(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("internal_notices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, items: (data ?? []) as InternalNotice[] };
}

export async function fetchInternalNoticeHistory(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return { ok: true as const, items: [] as InternalNoticeHistoryEntry[] };
  const { data, error } = await supabase
    .from("internal_notice_history")
    .select("*")
    .in("notice_id", ids)
    .order("created_at", { ascending: true });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, items: (data ?? []) as InternalNoticeHistoryEntry[] };
}

export async function createInternalNoticeRemote(
  supabase: SupabaseClient,
  input: CreateInternalNoticeInput,
) {
  const { data, error } = await supabase.rpc("create_internal_notice", {
    p_notice_type: input.notice_type,
    p_title: input.title,
    p_body: input.body,
    p_target_sector: input.target_sector ?? null,
    p_priority: input.priority,
    p_due_at: input.due_at ?? null,
    p_starts_at: input.starts_at ?? null,
    p_expires_at: input.expires_at ?? null,
    p_publish: input.publish ?? false,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, item: data as InternalNotice };
}

export async function transitionInternalNoticeRemote(
  supabase: SupabaseClient,
  input: {
    notice_id: string;
    action: "viewed" | "assume" | "started" | "completed" | "cancelled" | "archived" | "published";
    note?: string;
  },
) {
  const { data, error } = await supabase.rpc("transition_internal_notice", {
    p_notice_id: input.notice_id,
    p_action: input.action,
    p_assigned_to: null,
    p_note: input.note ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, item: data as InternalNotice };
}

export async function expireInternalNoticesRemote(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("expire_internal_notices");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, expired: Number(data ?? 0) };
}