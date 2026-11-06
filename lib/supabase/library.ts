import type { SupabaseClient } from "@supabase/supabase-js";
import type { LibraryItem, LibraryKind } from "@/types";

export type LibraryRow = {
  id: string;
  title: string;
  description: string | null;
  kind: LibraryKind;
  external_url: string | null;
  file_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  visible_to_clients: boolean;
  uploaded_by: string | null;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
};

export function mapLibraryRow(row: LibraryRow): LibraryItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    kind: row.kind,
    external_url: row.external_url ?? undefined,
    file_url: row.file_url ?? undefined,
    file_name: row.file_name ?? undefined,
    mime_type: row.mime_type ?? undefined,
    visible_to_clients: row.visible_to_clients,
    uploaded_by: row.uploaded_by ?? undefined,
    uploaded_by_name: row.uploaded_by_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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

export async function fetchLibraryItems(
  supabase: SupabaseClient,
): Promise<{ ok: true; items: LibraryItem[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    items: ((data ?? []) as LibraryRow[]).map(mapLibraryRow),
  };
}

export async function uploadLibraryFile(
  supabase: SupabaseClient,
  itemId: string,
  dataUrl: string,
  fileName?: string,
): Promise<{ ok: true; file_url: string } | { ok: false; error: string }> {
  try {
    const { blob, contentType } = dataUrlToBlob(dataUrl);
    const safeName = (fileName || "arquivo").replace(/[^\w.\-]+/g, "_");
    const path = `${itemId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("library").upload(path, blob, {
      contentType,
      upsert: true,
    });
    if (upErr) return { ok: false, error: upErr.message };
    const { data } = supabase.storage.from("library").getPublicUrl(path);
    if (!data?.publicUrl) return { ok: false, error: "Não foi possível obter o link do arquivo." };
    return { ok: true, file_url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha no upload." };
  }
}

export async function upsertLibraryItemRemote(
  supabase: SupabaseClient,
  item: LibraryItem,
): Promise<{ ok: true; item: LibraryItem } | { ok: false; error: string }> {
  const row = {
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    kind: item.kind,
    external_url: item.external_url ?? null,
    file_url: item.file_url ?? null,
    file_name: item.file_name ?? null,
    mime_type: item.mime_type ?? null,
    visible_to_clients: item.visible_to_clients,
    uploaded_by: item.uploaded_by ?? null,
    uploaded_by_name: item.uploaded_by_name,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
  const { data, error } = await supabase
    .from("library_items")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, item: mapLibraryRow(data as LibraryRow) };
}

export async function deleteLibraryItemRemote(
  supabase: SupabaseClient,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("library_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  try {
    const { data: files } = await supabase.storage.from("library").list(id);
    if (files?.length) {
      await supabase.storage.from("library").remove(files.map((f) => `${id}/${f.name}`));
    }
  } catch {
    // ignore storage cleanup errors
  }
  return { ok: true };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
