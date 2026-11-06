import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/supabase/library";
import type {
  BlogPost,
  BlogPostCategory,
  EducationItem,
  EducationKind,
  ShopProduct,
} from "@/types";

/* ─── Blog ─── */

type BlogRow = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: BlogPostCategory;
  author_name: string;
  cover_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export function mapBlogRow(row: BlogRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    body: row.body,
    category: row.category,
    author_name: row.author_name,
    cover_url: row.cover_url ?? undefined,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchBlogPostsRemote(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  return {
    ok: true as const,
    items: ((data ?? []) as BlogRow[]).map(mapBlogRow),
  };
}

export async function upsertBlogPostRemote(supabase: SupabaseClient, item: BlogPost) {
  const row = {
    id: isUuid(item.id) ? item.id : crypto.randomUUID(),
    title: item.title,
    excerpt: item.excerpt ?? null,
    body: item.body,
    category: item.category,
    author_name: item.author_name,
    cover_url: item.cover_url ?? null,
    published: item.published,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
  const { data, error } = await supabase
    .from("blog_posts")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, item: mapBlogRow(data as BlogRow) };
}

export async function deleteBlogPostRemote(supabase: SupabaseClient, id: string) {
  if (!isUuid(id)) return { ok: true as const };
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/* ─── Educação ─── */

type EduRow = {
  id: string;
  title: string;
  description: string | null;
  kind: EducationKind;
  url: string | null;
  author_or_source: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export function mapEducationRow(row: EduRow): EducationItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    kind: row.kind,
    url: row.url ?? undefined,
    author_or_source: row.author_or_source ?? undefined,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchEducationRemote(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("education_items")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  return {
    ok: true as const,
    items: ((data ?? []) as EduRow[]).map(mapEducationRow),
  };
}

export async function upsertEducationRemote(supabase: SupabaseClient, item: EducationItem) {
  const row = {
    id: isUuid(item.id) ? item.id : crypto.randomUUID(),
    title: item.title,
    description: item.description ?? null,
    kind: item.kind,
    url: item.url ?? null,
    author_or_source: item.author_or_source ?? null,
    published: item.published,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
  const { data, error } = await supabase
    .from("education_items")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, item: mapEducationRow(data as EduRow) };
}

export async function deleteEducationRemote(supabase: SupabaseClient, id: string) {
  if (!isUuid(id)) return { ok: true as const };
  const { error } = await supabase.from("education_items").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/* ─── Loja ─── */

type ShopRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function mapShopRow(row: ShopRow): ShopProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    price: Number(row.price),
    image_url: row.image_url ?? undefined,
    category: row.category ?? undefined,
    available: row.available,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchShopRemote(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return { ok: false as const, error: error.message };
  return {
    ok: true as const,
    items: ((data ?? []) as ShopRow[]).map(mapShopRow),
  };
}

export async function upsertShopRemote(supabase: SupabaseClient, item: ShopProduct) {
  const row = {
    id: isUuid(item.id) ? item.id : crypto.randomUUID(),
    name: item.name,
    description: item.description ?? null,
    price: item.price,
    image_url: item.image_url ?? null,
    category: item.category ?? null,
    available: item.available,
    sort_order: item.sort_order,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
  const { data, error } = await supabase
    .from("shop_products")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, item: mapShopRow(data as ShopRow) };
}

export async function deleteShopRemote(supabase: SupabaseClient, id: string) {
  if (!isUuid(id)) return { ok: true as const };
  const { error } = await supabase.from("shop_products").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Mescla remoto (UUID) + local demo (não-UUID). */
export function mergeById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    if (!isUuid(item.id) && !byId.has(item.id)) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}
