"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppStore } from "@/hooks/use-app-store";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  callRegisterWorkshop,
  deleteRow,
  fetchWorkshopsBundle,
  upsertRow,
  type WorkshopsBundle,
} from "@/lib/supabase/workshops";
import {
  DEFAULT_CERTIFICATE_SETTINGS,
  WORKSHOPS_STORAGE_KEY,
  countSpots,
  makeCertificateCode,
  seedRegistrations,
  seedWorkshops,
  todayYmd,
  type SpotInfo,
} from "@/lib/workshops";
import type {
  Certificate,
  CertificateCorrectionRequest,
  CertificateKind,
  CertificateSettings,
  Profile,
  Workshop,
  WorkshopModality,
  WorkshopRegistration,
  WorkshopRegistrationStatus,
} from "@/types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

type LocalData = {
  workshops: Workshop[];
  registrations: WorkshopRegistration[];
  certificates: Certificate[];
  settings: CertificateSettings;
  corrections: CertificateCorrectionRequest[];
};

export type RegistrationInput = Omit<
  WorkshopRegistration,
  "id" | "status" | "created_at" | "updated_at" | "user_id" | "added_by_staff"
>;

export type WorkshopInput = Omit<Workshop, "id" | "created_at" | "updated_at"> & { id?: string };

export type ManualCertificateInput = {
  kind: CertificateKind;
  printed_name: string;
  email?: string;
  user_id?: string;
  title: string;
  reference_id?: string;
  completed_on: string;
  modality: WorkshopModality;
  workload?: string;
};

type WorkshopsStore = {
  ready: boolean;
  cloud: boolean;
  /** Tabelas ainda não criadas no Supabase (migração 029 pendente). */
  missingMigration: boolean;
  workshops: Workshop[];
  registrations: WorkshopRegistration[];
  certificates: Certificate[];
  settings: CertificateSettings;
  corrections: CertificateCorrectionRequest[];
  canManage: boolean;
  spotsFor: (w: Workshop) => SpotInfo;
  myRegistration: (workshopId: string) => WorkshopRegistration | undefined;
  myCertificates: Certificate[];
  refresh: () => Promise<void>;
  upsertWorkshop: (input: WorkshopInput) => Promise<Result<Workshop>>;
  removeWorkshop: (id: string) => Promise<Result>;
  duplicateWorkshop: (id: string) => Promise<Result<Workshop>>;
  register: (workshopId: string, input: RegistrationInput) => Promise<Result<WorkshopRegistration>>;
  addManualRegistration: (
    workshopId: string,
    input: RegistrationInput,
  ) => Promise<Result<WorkshopRegistration>>;
  setRegistrationStatus: (id: string, status: WorkshopRegistrationStatus) => Promise<Result>;
  cancelMyRegistration: (id: string) => Promise<Result>;
  issueForRegistration: (registrationId: string) => Promise<Result<Certificate>>;
  issueWorkshopCertificates: (workshopId: string) => Promise<Result<{ issued: number }>>;
  issueManualCertificate: (input: ManualCertificateInput) => Promise<Result<Certificate>>;
  revokeCertificate: (id: string) => Promise<Result>;
  reissueCertificate: (id: string, printedName?: string) => Promise<Result<Certificate>>;
  markCertificateSeen: (id: string) => void;
  saveSettings: (s: Partial<CertificateSettings>) => Promise<Result>;
  requestNameCorrection: (certificateId: string, name: string) => Promise<Result>;
  resolveCorrection: (id: string) => Promise<Result>;
};

const Ctx = createContext<WorkshopsStore | null>(null);

const nowIso = () => new Date().toISOString();
const localId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function loadLocal(): LocalData {
  const empty: LocalData = {
    workshops: seedWorkshops(),
    registrations: seedRegistrations(),
    certificates: [],
    settings: { ...DEFAULT_CERTIFICATE_SETTINGS },
    corrections: [],
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(WORKSHOPS_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<LocalData>;
    return {
      workshops: parsed.workshops ?? empty.workshops,
      registrations: parsed.registrations ?? empty.registrations,
      certificates: parsed.certificates ?? [],
      settings: { ...DEFAULT_CERTIFICATE_SETTINGS, ...(parsed.settings ?? {}) },
      corrections: parsed.corrections ?? [],
    };
  } catch {
    return empty;
  }
}

function saveLocal(data: LocalData) {
  try {
    window.localStorage.setItem(WORKSHOPS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota — imagens grandes */
  }
}

function isStaff(p: Profile | null) {
  return p?.role === "pai_de_santo" || p?.role === "administrador";
}

function friendlyError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find")) {
    return "As tabelas de oficinas ainda não existem no Supabase. Rode a migração 029 no SQL Editor.";
  }
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "Sem permissão no Supabase para esta ação.";
  }
  return msg;
}

export function WorkshopsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, state: appState, addNotification } = useAppStore();
  const cloud = isSupabaseConfigured();
  const [data, setData] = useState<LocalData>(() => ({
    workshops: [],
    registrations: [],
    certificates: [],
    settings: { ...DEFAULT_CERTIFICATE_SETTINGS },
    corrections: [],
  }));
  const [counts, setCounts] = useState<WorkshopsBundle["counts"]>({});
  const [ready, setReady] = useState(false);
  const [missingMigration, setMissingMigration] = useState(false);
  const dataRef = useRef(data);

  const canManage = isStaff(currentUser);

  const commit = useCallback(
    (updater: (prev: LocalData) => LocalData) => {
      const next = updater(dataRef.current);
      dataRef.current = next;
      if (!cloud) saveLocal(next);
      setData(next);
    },
    [cloud],
  );

  const refresh = useCallback(async () => {
    if (!cloud) {
      const local = loadLocal();
      dataRef.current = local;
      setData(local);
      setReady(true);
      return;
    }
    const supabase = createBrowserClient();
    if (!supabase) return;
    const bundle = await fetchWorkshopsBundle(supabase);
    if (bundle.missing) {
      setMissingMigration(true);
      setReady(true);
      return;
    }
    setMissingMigration(false);
    const next: LocalData = {
      workshops: bundle.workshops,
      registrations: bundle.registrations,
      certificates: bundle.certificates,
      settings: { ...DEFAULT_CERTIFICATE_SETTINGS, ...(bundle.settings ?? {}) },
      corrections: bundle.corrections,
    };
    dataRef.current = next;
    setData(next);
    setCounts(bundle.counts);
    setReady(true);
  }, [cloud]);

  useEffect(() => {
    void refresh();
  }, [refresh, currentUser?.id]);

  // Sincronia entre abas (demo) e realtime (Supabase)
  useEffect(() => {
    if (!cloud) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === WORKSHOPS_STORAGE_KEY) void refresh();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
    const supabase = createBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("workshops_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshops" }, () => void refresh())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workshop_registrations" },
        () => void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "certificates" }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cloud, refresh]);

  const spotsFor = useCallback(
    (w: Workshop) => countSpots(w, data.registrations, cloud && !canManage ? counts : undefined),
    [data.registrations, counts, cloud, canManage],
  );

  const myRegistration = useCallback(
    (workshopId: string) => {
      if (!currentUser) return undefined;
      const email = currentUser.email.toLowerCase();
      return data.registrations.find(
        (r) =>
          r.workshop_id === workshopId &&
          r.status !== "cancelada" &&
          (r.user_id === currentUser.id || r.email.toLowerCase() === email),
      );
    },
    [currentUser, data.registrations],
  );

  const myCertificates = useMemo(() => {
    if (!currentUser) return [];
    const email = currentUser.email.toLowerCase();
    return data.certificates
      .filter(
        (c) =>
          c.status === "disponivel" &&
          (c.user_id === currentUser.id || (c.email ?? "").toLowerCase() === email),
      )
      .sort((a, b) => b.issued_at.localeCompare(a.issued_at));
  }, [currentUser, data.certificates]);

  /* ─── persistência genérica ─── */

  const persist = useCallback(
    async <T extends { id: string }>(
      table: string,
      key: keyof LocalData,
      row: T,
    ): Promise<Result<T>> => {
      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) return { ok: false, error: "Supabase não configurado." };
        const res = await upsertRow<T>(supabase, table, row);
        if (!res.ok) return { ok: false, error: friendlyError(res.error) };
        row = res.data;
      }
      commit((prev) => {
        const list = prev[key] as unknown as T[];
        const exists = list.some((x) => x.id === row.id);
        const nextList = exists ? list.map((x) => (x.id === row.id ? row : x)) : [row, ...list];
        return { ...prev, [key]: nextList };
      });
      return { ok: true, data: row };
    },
    [cloud, commit],
  );

  const notifyStaff = useCallback(
    (title: string, body: string, href?: string) => {
      addNotification({
        title,
        body,
        type: "oficina",
        audience: ["pai_de_santo", "administrador"],
        href,
      });
    },
    [addNotification],
  );

  /* ─── Oficinas ─── */

  const upsertWorkshop: WorkshopsStore["upsertWorkshop"] = useCallback(
    async (input) => {
      if (!canManage || !currentUser) return { ok: false, error: "Sem permissão para gerenciar oficinas." };
      const title = input.title.trim();
      if (title.length < 3) return { ok: false, error: "Informe o nome da oficina." };
      if (input.status !== "em_breve" && input.status !== "rascunho" && !input.date) {
        return { ok: false, error: "Informe a data (ou marque como “Em breve”)." };
      }
      if (input.total_spots < 0) return { ok: false, error: "Quantidade de vagas inválida." };
      const existing = input.id ? dataRef.current.workshops.find((w) => w.id === input.id) : undefined;
      const stamp = nowIso();
      const row: Workshop = {
        ...input,
        id: existing?.id ?? (cloud ? crypto.randomUUID() : localId("wks")),
        title,
        short_description: input.short_description.trim().slice(0, 120),
        topics: input.topics.map((t) => t.trim()).filter(Boolean),
        created_by: existing?.created_by ?? currentUser.id,
        created_by_name: existing?.created_by_name ?? currentUser.full_name,
        updated_by_name: currentUser.full_name,
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp,
      };
      const res = await persist("workshops", "workshops", row);
      if (
        res.ok &&
        existing &&
        existing.status !== "encerrada" &&
        row.status === "encerrada" &&
        dataRef.current.settings.auto_release_on_close &&
        row.issues_certificate
      ) {
        // liberação automática ao encerrar
        await issueWorkshopCertificatesRef.current?.(row.id);
      }
      return res;
    },
    [canManage, currentUser, cloud, persist],
  );

  const removeWorkshop: WorkshopsStore["removeWorkshop"] = useCallback(
    async (id) => {
      if (!canManage || !currentUser) return { ok: false, error: "Sem permissão." };
      const w = dataRef.current.workshops.find((x) => x.id === id);
      if (!w) return { ok: false, error: "Oficina não encontrada." };
      const isOwner = w.created_by === currentUser.id;
      const canDelete =
        currentUser.role === "administrador" ||
        isOwner ||
        (currentUser.role === "pai_de_santo" && dataRef.current.settings.pai_can_delete_any);
      if (!canDelete) return { ok: false, error: "Só quem criou (ou o Administrador) pode excluir." };
      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) return { ok: false, error: "Supabase não configurado." };
        const res = await deleteRow(supabase, "workshops", id);
        if (!res.ok) return { ok: false, error: friendlyError(res.error) };
      }
      commit((prev) => ({
        ...prev,
        workshops: prev.workshops.filter((x) => x.id !== id),
        registrations: prev.registrations.filter((r) => r.workshop_id !== id),
      }));
      return { ok: true };
    },
    [canManage, currentUser, cloud, commit],
  );

  const duplicateWorkshop: WorkshopsStore["duplicateWorkshop"] = useCallback(
    async (id) => {
      const w = dataRef.current.workshops.find((x) => x.id === id);
      if (!w) return { ok: false, error: "Oficina não encontrada." };
      const { id: _old, created_at: _c, updated_at: _u, created_by: _b, created_by_name: _n, ...rest } = w;
      void _old;
      void _c;
      void _u;
      void _b;
      void _n;
      return upsertWorkshop({ ...rest, title: `${w.title} (cópia)`, status: "rascunho" });
    },
    [upsertWorkshop],
  );

  /* ─── Inscrições ─── */

  const buildRegistration = useCallback(
    (workshop: Workshop, input: RegistrationInput, staff: boolean): Result<WorkshopRegistration> => {
      const name = input.full_name.trim();
      const email = input.email.trim().toLowerCase();
      if (name.split(/\s+/).length < 2) return { ok: false, error: "Informe o nome completo." };
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Informe um e-mail válido." };
      if (input.phone.replace(/\D/g, "").length < 10) {
        return { ok: false, error: "Informe um WhatsApp com DDD." };
      }
      if (!staff && !input.accepted_terms) {
        return { ok: false, error: "É preciso aceitar as orientações da casa." };
      }
      const dup = dataRef.current.registrations.find(
        (r) =>
          r.workshop_id === workshop.id &&
          r.status !== "cancelada" &&
          (r.email.toLowerCase() === email || (currentUser && !staff && r.user_id === currentUser.id)),
      );
      if (dup) return { ok: false, error: "Já existe uma inscrição com este e-mail nesta oficina." };
      const spots = countSpots(workshop, dataRef.current.registrations);
      const status: WorkshopRegistrationStatus = spots.full ? "lista_espera" : "confirmada";
      if (spots.full && !workshop.allow_waitlist && !staff) {
        return { ok: false, error: "As vagas desta oficina esgotaram." };
      }
      const stamp = nowIso();
      const linkedProfile = appState.profiles.find((p) => p.email.toLowerCase() === email);
      return {
        ok: true,
        data: {
          ...input,
          id: cloud ? crypto.randomUUID() : localId("wkr"),
          workshop_id: workshop.id,
          full_name: name,
          email,
          user_id: !staff && currentUser ? currentUser.id : linkedProfile?.id,
          status,
          added_by_staff: staff || undefined,
          created_at: stamp,
          updated_at: stamp,
        },
      };
    },
    [appState.profiles, cloud, currentUser],
  );

  const register: WorkshopsStore["register"] = useCallback(
    async (workshopId, input) => {
      const workshop = dataRef.current.workshops.find((w) => w.id === workshopId);
      if (!workshop) return { ok: false, error: "Oficina não encontrada." };
      const built = buildRegistration(workshop, input, false);
      if (!built.ok || !built.data) return built;
      let row = built.data;
      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) return { ok: false, error: "Supabase não configurado." };
        const res = await callRegisterWorkshop(supabase, row);
        if (!res.ok) return { ok: false, error: friendlyError(res.error) };
        row = res.data;
        void refresh();
      } else {
        commit((prev) => ({ ...prev, registrations: [row, ...prev.registrations] }));
      }
      notifyStaff(
        row.status === "lista_espera" ? "Nova pessoa na lista de espera" : "Nova inscrição em oficina",
        `${row.full_name} · ${workshop.title}`,
        `/gestao-oficinas/${workshop.id}/inscritos`,
      );
      return { ok: true, data: row };
    },
    [buildRegistration, cloud, commit, notifyStaff, refresh],
  );

  const addManualRegistration: WorkshopsStore["addManualRegistration"] = useCallback(
    async (workshopId, input) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      const workshop = dataRef.current.workshops.find((w) => w.id === workshopId);
      if (!workshop) return { ok: false, error: "Oficina não encontrada." };
      const built = buildRegistration(workshop, { ...input, accepted_terms: true }, true);
      if (!built.ok || !built.data) return built;
      return persist("workshop_registrations", "registrations", built.data);
    },
    [buildRegistration, canManage, persist],
  );

  /** Ao liberar vaga, promove a 1ª pessoa da lista de espera. */
  const promoteWaitlist = useCallback(
    async (workshopId: string) => {
      const workshop = dataRef.current.workshops.find((w) => w.id === workshopId);
      if (!workshop) return;
      const spots = countSpots(workshop, dataRef.current.registrations);
      if (spots.full) return;
      const next = dataRef.current.registrations
        .filter((r) => r.workshop_id === workshopId && r.status === "lista_espera")
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      if (!next) return;
      await persist("workshop_registrations", "registrations", {
        ...next,
        status: "confirmada" as const,
        updated_at: nowIso(),
      });
      notifyStaff(
        "Vaga liberada na oficina",
        `${next.full_name} saiu da lista de espera e foi confirmada em ${workshop.title}. Avise pelo WhatsApp.`,
        `/gestao-oficinas/${workshopId}/inscritos`,
      );
    },
    [notifyStaff, persist],
  );

  const setRegistrationStatus: WorkshopsStore["setRegistrationStatus"] = useCallback(
    async (id, status) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      const reg = dataRef.current.registrations.find((r) => r.id === id);
      if (!reg) return { ok: false, error: "Inscrição não encontrada." };
      const res = await persist("workshop_registrations", "registrations", {
        ...reg,
        status,
        updated_at: nowIso(),
      });
      if (res.ok && status === "cancelada" && reg.status !== "lista_espera") {
        await promoteWaitlist(reg.workshop_id);
      }
      return res.ok ? { ok: true } : res;
    },
    [canManage, persist, promoteWaitlist],
  );

  const cancelMyRegistration: WorkshopsStore["cancelMyRegistration"] = useCallback(
    async (id) => {
      const reg = dataRef.current.registrations.find((r) => r.id === id);
      if (!reg || !currentUser) return { ok: false, error: "Inscrição não encontrada." };
      const res = await persist("workshop_registrations", "registrations", {
        ...reg,
        status: "cancelada" as const,
        updated_at: nowIso(),
      });
      if (res.ok) {
        const w = dataRef.current.workshops.find((x) => x.id === reg.workshop_id);
        notifyStaff("Inscrição cancelada", `${reg.full_name} cancelou · ${w?.title ?? "oficina"}`);
        if (reg.status !== "lista_espera") await promoteWaitlist(reg.workshop_id);
      }
      return res.ok ? { ok: true } : res;
    },
    [currentUser, notifyStaff, persist, promoteWaitlist],
  );

  /* ─── Certificados ─── */

  const buildCertificate = useCallback(
    (input: ManualCertificateInput): Certificate => {
      const s = dataRef.current.settings;
      const stamp = nowIso();
      const email = input.email?.trim().toLowerCase() || undefined;
      const linked =
        input.user_id ??
        (email ? appState.profiles.find((p) => p.email.toLowerCase() === email)?.id : undefined);
      return {
        id: cloud ? crypto.randomUUID() : localId("cert"),
        code: makeCertificateCode(dataRef.current.certificates),
        user_id: linked,
        email,
        kind: input.kind,
        reference_id: input.reference_id,
        printed_name: input.printed_name.trim(),
        title: input.title.trim(),
        completed_on: input.completed_on || todayYmd(),
        modality: input.modality,
        workload: input.workload?.trim() || undefined,
        signer_name: s.signer_name,
        signer_title: s.signer_title,
        second_signer_label: s.second_signer_label,
        signature_data_url: s.signature_data_url,
        status: "disponivel",
        issued_at: stamp,
        issued_by_name: currentUser?.full_name,
        created_at: stamp,
        updated_at: stamp,
      };
    },
    [appState.profiles, cloud, currentUser],
  );

  const certificateForRegistration = useCallback((reg: WorkshopRegistration) => {
    return dataRef.current.certificates.find(
      (c) =>
        c.kind === "oficina" &&
        c.reference_id === reg.workshop_id &&
        c.status === "disponivel" &&
        (c.email ?? "").toLowerCase() === reg.email.toLowerCase(),
    );
  }, []);

  const issueForRegistration: WorkshopsStore["issueForRegistration"] = useCallback(
    async (registrationId) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      const reg = dataRef.current.registrations.find((r) => r.id === registrationId);
      if (!reg) return { ok: false, error: "Inscrição não encontrada." };
      const already = certificateForRegistration(reg);
      if (already) return { ok: true, data: already };
      const w = dataRef.current.workshops.find((x) => x.id === reg.workshop_id);
      if (!w) return { ok: false, error: "Oficina não encontrada." };
      const cert = buildCertificate({
        kind: "oficina",
        printed_name: reg.full_name,
        email: reg.email,
        user_id: reg.user_id,
        title: w.title,
        reference_id: w.id,
        completed_on: w.date ?? todayYmd(),
        modality: w.modality,
        workload: w.workload,
      });
      if (w.certificate_signer_name?.trim()) cert.signer_name = w.certificate_signer_name.trim();
      return persist("certificates", "certificates", cert);
    },
    [buildCertificate, canManage, certificateForRegistration, persist],
  );

  const issueWorkshopCertificates: WorkshopsStore["issueWorkshopCertificates"] = useCallback(
    async (workshopId) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      const presentes = dataRef.current.registrations.filter(
        (r) => r.workshop_id === workshopId && r.status === "presente",
      );
      if (presentes.length === 0) {
        return { ok: false, error: "Marque a presença de quem participou antes de liberar." };
      }
      let issued = 0;
      for (const reg of presentes) {
        if (certificateForRegistration(reg)) continue;
        const res = await issueForRegistration(reg.id);
        if (!res.ok) return res;
        issued += 1;
      }
      return { ok: true, data: { issued } };
    },
    [canManage, certificateForRegistration, issueForRegistration],
  );

  const issueWorkshopCertificatesRef = useRef<WorkshopsStore["issueWorkshopCertificates"] | null>(null);
  issueWorkshopCertificatesRef.current = issueWorkshopCertificates;

  const issueManualCertificate: WorkshopsStore["issueManualCertificate"] = useCallback(
    async (input) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      if (input.printed_name.trim().split(/\s+/).length < 2) {
        return { ok: false, error: "Informe o nome completo como deve sair no certificado." };
      }
      if (input.title.trim().length < 3) return { ok: false, error: "Informe o nome do curso/oficina." };
      if (!input.completed_on) return { ok: false, error: "Informe a data de conclusão." };
      return persist("certificates", "certificates", buildCertificate(input));
    },
    [buildCertificate, canManage, persist],
  );

  const revokeCertificate: WorkshopsStore["revokeCertificate"] = useCallback(
    async (id) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      const c = dataRef.current.certificates.find((x) => x.id === id);
      if (!c) return { ok: false, error: "Certificado não encontrado." };
      const res = await persist("certificates", "certificates", {
        ...c,
        status: "revogado" as const,
        revoked_at: nowIso(),
        revoked_by_name: currentUser?.full_name,
        updated_at: nowIso(),
      });
      return res.ok ? { ok: true } : res;
    },
    [canManage, currentUser, persist],
  );

  const reissueCertificate: WorkshopsStore["reissueCertificate"] = useCallback(
    async (id, printedName) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      const c = dataRef.current.certificates.find((x) => x.id === id);
      if (!c) return { ok: false, error: "Certificado não encontrado." };
      if (c.status !== "revogado") {
        const rv = await revokeCertificate(id);
        if (!rv.ok) return rv;
      }
      return persist(
        "certificates",
        "certificates",
        buildCertificate({
          kind: c.kind,
          printed_name: printedName?.trim() || c.printed_name,
          email: c.email,
          user_id: c.user_id,
          title: c.title,
          reference_id: c.reference_id,
          completed_on: c.completed_on,
          modality: c.modality,
          workload: c.workload,
        }),
      );
    },
    [buildCertificate, canManage, persist, revokeCertificate],
  );

  const markCertificateSeen = useCallback(
    (id: string) => {
      const c = dataRef.current.certificates.find((x) => x.id === id);
      if (!c || c.seen_at) return;
      const row = { ...c, seen_at: nowIso() };
      commit((prev) => ({
        ...prev,
        certificates: prev.certificates.map((x) => (x.id === id ? row : x)),
      }));
      if (cloud) {
        const supabase = createBrowserClient();
        if (supabase) {
          void supabase.rpc("mark_certificate_seen", { p_id: id });
        }
      }
    },
    [cloud, commit],
  );

  const saveSettings: WorkshopsStore["saveSettings"] = useCallback(
    async (patch) => {
      if (!canManage) return { ok: false, error: "Sem permissão." };
      const next: CertificateSettings = {
        ...dataRef.current.settings,
        ...patch,
        updated_at: nowIso(),
        updated_by_name: currentUser?.full_name,
      };
      if (!next.signer_name.trim()) return { ok: false, error: "Informe o nome de quem assina." };
      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) return { ok: false, error: "Supabase não configurado." };
        const res = await upsertRow(supabase, "certificate_settings", { id: 1, ...next } as never);
        if (!res.ok) return { ok: false, error: friendlyError(res.error) };
      }
      commit((prev) => ({ ...prev, settings: next }));
      return { ok: true };
    },
    [canManage, cloud, commit, currentUser],
  );

  const requestNameCorrection: WorkshopsStore["requestNameCorrection"] = useCallback(
    async (certificateId, name) => {
      const c = dataRef.current.certificates.find((x) => x.id === certificateId);
      if (!c || !currentUser) return { ok: false, error: "Certificado não encontrado." };
      if (name.trim().split(/\s+/).length < 2) return { ok: false, error: "Informe o nome completo." };
      const row: CertificateCorrectionRequest = {
        id: cloud ? crypto.randomUUID() : localId("corr"),
        certificate_id: c.id,
        requested_name: name.trim(),
        requested_by_name: currentUser.full_name,
        status: "pendente",
        created_at: nowIso(),
      };
      const res = await persist("certificate_corrections", "corrections", row);
      if (!res.ok) return res;
      notifyStaff(
        "Correção de nome no certificado",
        `${currentUser.full_name} pediu: “${row.requested_name}” · ${c.title} (${c.code})`,
        "/certificados",
      );
      return { ok: true };
    },
    [cloud, currentUser, notifyStaff, persist],
  );

  const resolveCorrection: WorkshopsStore["resolveCorrection"] = useCallback(
    async (id) => {
      const r = dataRef.current.corrections.find((x) => x.id === id);
      if (!r) return { ok: false, error: "Pedido não encontrado." };
      const res = await persist("certificate_corrections", "corrections", {
        ...r,
        status: "resolvida" as const,
      });
      return res.ok ? { ok: true } : res;
    },
    [persist],
  );

  const value = useMemo<WorkshopsStore>(
    () => ({
      ready,
      cloud,
      missingMigration,
      workshops: data.workshops,
      registrations: data.registrations,
      certificates: data.certificates,
      settings: data.settings,
      corrections: data.corrections,
      canManage,
      spotsFor,
      myRegistration,
      myCertificates,
      refresh,
      upsertWorkshop,
      removeWorkshop,
      duplicateWorkshop,
      register,
      addManualRegistration,
      setRegistrationStatus,
      cancelMyRegistration,
      issueForRegistration,
      issueWorkshopCertificates,
      issueManualCertificate,
      revokeCertificate,
      reissueCertificate,
      markCertificateSeen,
      saveSettings,
      requestNameCorrection,
      resolveCorrection,
    }),
    [
      ready,
      cloud,
      missingMigration,
      data,
      canManage,
      spotsFor,
      myRegistration,
      myCertificates,
      refresh,
      upsertWorkshop,
      removeWorkshop,
      duplicateWorkshop,
      register,
      addManualRegistration,
      setRegistrationStatus,
      cancelMyRegistration,
      issueForRegistration,
      issueWorkshopCertificates,
      issueManualCertificate,
      revokeCertificate,
      reissueCertificate,
      markCertificateSeen,
      saveSettings,
      requestNameCorrection,
      resolveCorrection,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkshops() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkshops precisa do WorkshopsProvider");
  return ctx;
}
