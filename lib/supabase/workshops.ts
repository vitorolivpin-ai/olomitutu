import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Certificate,
  CertificateCorrectionRequest,
  CertificateSettings,
  Workshop,
  WorkshopRegistration,
} from "@/types";

/** Converte null → undefined (linhas do Postgres → tipos do app). */
function clean<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null) out[k] = v;
  }
  return out as T;
}

/** Converte undefined → null (tipos do app → Postgres). */
function toRow(obj: object) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === undefined ? null : v;
  return out;
}

function isMissing(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const m = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    m.includes("does not exist") ||
    m.includes("could not find the table") ||
    m.includes("schema cache")
  );
}

export type WorkshopsBundle = {
  missing: boolean;
  workshops: Workshop[];
  registrations: WorkshopRegistration[];
  certificates: Certificate[];
  settings: CertificateSettings | null;
  corrections: CertificateCorrectionRequest[];
  counts: Record<string, { confirmed: number; waitlist: number }>;
};

export async function fetchWorkshopsBundle(supabase: SupabaseClient): Promise<WorkshopsBundle> {
  const [w, r, c, s, k, counts] = await Promise.all([
    supabase.from("workshops").select("*").order("date", { ascending: true, nullsFirst: false }),
    supabase.from("workshop_registrations").select("*").order("created_at", { ascending: true }),
    supabase.from("certificates").select("*").order("issued_at", { ascending: false }),
    supabase.from("certificate_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("certificate_corrections").select("*").order("created_at", { ascending: false }),
    supabase.rpc("workshop_spot_counts"),
  ]);
  const missing = isMissing(w.error);
  const countMap: WorkshopsBundle["counts"] = {};
  for (const row of (counts.data ?? []) as Array<{
    workshop_id: string;
    confirmed: number;
    waitlist: number;
  }>) {
    countMap[row.workshop_id] = { confirmed: Number(row.confirmed), waitlist: Number(row.waitlist) };
  }
  let settings: CertificateSettings | null = null;
  if (s.data) {
    const { id: _id, ...rest } = s.data as Record<string, unknown>;
    void _id;
    settings = clean<CertificateSettings>(rest);
  }
  return {
    missing,
    workshops: ((w.data ?? []) as Record<string, unknown>[]).map((x) => {
      const ws = clean<Workshop>(x);
      return { ...ws, topics: ws.topics ?? [], price: Number(ws.price ?? 0) };
    }),
    registrations: ((r.data ?? []) as Record<string, unknown>[]).map((x) =>
      clean<WorkshopRegistration>(x),
    ),
    certificates: ((c.data ?? []) as Record<string, unknown>[]).map((x) => clean<Certificate>(x)),
    settings,
    corrections: ((k.data ?? []) as Record<string, unknown>[]).map((x) =>
      clean<CertificateCorrectionRequest>(x),
    ),
    counts: countMap,
  };
}

export async function upsertRow<T extends object>(
  supabase: SupabaseClient,
  table: string,
  row: T,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const { data, error } = await supabase.from(table).upsert(toRow(row)).select("*").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: clean<T>(data as Record<string, unknown>) };
}

export async function deleteRow(supabase: SupabaseClient, table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Inscrição com trava de vagas no banco (confirmada x lista de espera). */
export async function callRegisterWorkshop(
  supabase: SupabaseClient,
  row: WorkshopRegistration,
): Promise<{ ok: true; data: WorkshopRegistration } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("register_workshop", { p: toRow(row) });
  if (error) return { ok: false, error: error.message };
  const first = Array.isArray(data) ? data[0] : data;
  if (!first) return { ok: false, error: "Não foi possível concluir a inscrição." };
  return { ok: true, data: clean<WorkshopRegistration>(first as Record<string, unknown>) };
}

export type PublicCertificate = Pick<
  Certificate,
  | "code"
  | "kind"
  | "printed_name"
  | "title"
  | "completed_on"
  | "modality"
  | "workload"
  | "signer_name"
  | "signer_title"
  | "status"
  | "issued_at"
>;

export async function verifyCertificateRemote(
  supabase: SupabaseClient,
  code: string,
): Promise<PublicCertificate | null> {
  const { data, error } = await supabase.rpc("verify_certificate", { p_code: code });
  if (error) return null;
  const first = Array.isArray(data) ? data[0] : data;
  return first ? clean<PublicCertificate>(first as Record<string, unknown>) : null;
}
