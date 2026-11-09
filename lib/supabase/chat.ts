import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, Message, MessageKind, UserRole } from "@/types";
import { isUuid } from "@/lib/supabase/library";

export type MessageRow = {
  id: string;
  client_id: string;
  sender_id: string | null;
  sender_role: UserRole;
  sender_name: string;
  recipient_role: UserRole | null;
  body: string;
  kind: MessageKind | null;
  audio_url: string | null;
  audio_path: string | null;
  audio_duration_sec: number | null;
  video_url: string | null;
  video_path: string | null;
  call_url: string | null;
  appointment_id: string | null;
  created_at: string;
};

export type ClientRow = {
  id: string;
  responsible_profile_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  birth_date: string | null;
  registration_complete: boolean | null;
  created_at: string;
  updated_at: string;
};

export function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    client_id: row.client_id,
    sender_id: row.sender_id ?? undefined,
    sender_role: row.sender_role,
    sender_name: row.sender_name,
    recipient_role: row.recipient_role ?? undefined,
    body: row.body,
    kind: row.kind ?? "text",
    audio_url: row.audio_url ?? undefined,
    audio_path: row.audio_path ?? undefined,
    audio_duration_sec: row.audio_duration_sec ?? undefined,
    video_url: row.video_url ?? undefined,
    video_path: row.video_path ?? undefined,
    call_url: row.call_url ?? undefined,
    appointment_id: row.appointment_id ?? undefined,
    created_at: row.created_at,
  };
}

export function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    responsible_profile_id: row.responsible_profile_id ?? undefined,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    birth_date: row.birth_date ?? undefined,
    registration_complete: row.registration_complete ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Garante ficha local para cada client_id que tem mensagem (senão a lista some o chat). */
export function ensureClientsFromMessages(
  clients: Client[],
  messages: Message[],
): Client[] {
  const byId = new Map(clients.map((c) => [c.id, c]));
  const stamp = new Date().toISOString();
  for (const msg of messages) {
    if (!msg.client_id || byId.has(msg.client_id)) continue;
    const nameFromClient =
      messages
        .filter((m) => m.client_id === msg.client_id && m.sender_role === "cliente")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.sender_name ??
      "Cliente";
    byId.set(msg.client_id, {
      id: msg.client_id,
      full_name: nameFromClient,
      phone: "—",
      registration_complete: false,
      created_at: stamp,
      updated_at: stamp,
    });
  }
  return Array.from(byId.values());
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const comma = dataUrl.indexOf(",");
  const meta = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const contentType = /data:(.*?);/.exec(meta)?.[1] || "application/octet-stream";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

export async function uploadChatMedia(
  supabase: SupabaseClient,
  clientId: string,
  dataUrl: string,
  folder: "audio" | "video",
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    const { blob, contentType } = dataUrlToBlob(dataUrl);
    const ext =
      contentType.includes("webm")
        ? "webm"
        : contentType.includes("mp4")
          ? "mp4"
          : contentType.includes("ogg")
            ? "ogg"
            : contentType.includes("mpeg") || contentType.includes("mp3")
              ? "mp3"
              : "bin";
    const path = `${clientId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat").upload(path, blob, {
      contentType,
      upsert: false,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha no upload." };
  }
}

export async function fetchChatMessages(
  supabase: SupabaseClient,
): Promise<{ ok: true; items: Message[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const items = await Promise.all(
    ((data ?? []) as MessageRow[]).map(async (row) => {
      const message = mapMessageRow(row);
      const [audio, video] = await Promise.all([
        message.audio_path
          ? supabase.storage.from("chat").createSignedUrl(message.audio_path, 60 * 15)
          : Promise.resolve({ data: null }),
        message.video_path
          ? supabase.storage.from("chat").createSignedUrl(message.video_path, 60 * 15)
          : Promise.resolve({ data: null }),
      ]);
      return {
        ...message,
        audio_url: audio.data?.signedUrl,
        video_url: video.data?.signedUrl,
      };
    }),
  );
  return { ok: true, items };
}

export async function fetchClientsRemote(
  supabase: SupabaseClient,
): Promise<{ ok: true; items: Client[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, items: ((data ?? []) as ClientRow[]).map(mapClientRow) };
}

export async function insertMessageRemote(
  supabase: SupabaseClient,
  message: Message,
): Promise<{ ok: true; item: Message } | { ok: false; error: string }> {
  if (!isUuid(message.client_id)) {
    return {
      ok: false,
      error: "Ficha do cliente inválida na nuvem. Saia e entre de novo (migration 017).",
    };
  }
  const row = {
    id: isUuid(message.id) ? message.id : crypto.randomUUID(),
    client_id: message.client_id,
    sender_id: message.sender_id && isUuid(message.sender_id) ? message.sender_id : null,
    sender_role: message.sender_role,
    sender_name: message.sender_name,
    recipient_role: message.recipient_role ?? null,
    body: message.body,
    kind: message.kind ?? "text",
    audio_url: message.audio_url ?? null,
    audio_path: message.audio_path ?? null,
    audio_duration_sec: message.audio_duration_sec ?? null,
    video_url: message.video_url ?? null,
    video_path: message.video_path ?? null,
    call_url: message.call_url ?? null,
    appointment_id:
      message.appointment_id && isUuid(message.appointment_id)
        ? message.appointment_id
        : null,
    created_at: message.created_at,
  };
  const { data, error } = await supabase.from("messages").insert(row).select("*").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, item: mapMessageRow(data as MessageRow) };
}

export async function updateClientRegistrationRemote(
  supabase: SupabaseClient,
  input: {
    client_id: string;
    full_name: string;
    phone: string;
    email?: string;
    birth_date: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(input.client_id)) {
    return { ok: false, error: "Ficha do cliente inválida." };
  }
  const { error } = await supabase
    .from("clients")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      email: input.email ?? null,
      birth_date: input.birth_date,
      registration_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.client_id);
  if (error) return { ok: false, error: error.message };

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      email: input.email ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
  if (profileErr) {
    console.warn("profile update after cadastro:", profileErr.message);
  }
  return { ok: true };
}
