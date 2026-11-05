"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedState, DEMO_PASSWORD } from "@/lib/seed";
import {
  DATA_KEY,
  loadSessionUserId,
  loadSharedData,
  persistSessionUserId,
  persistSharedData,
  stripSession,
  type SharedData,
} from "@/lib/storage";
import { nowIso, uid } from "@/lib/utils";
import type {
  AppNotification,
  AppState,
  Appointment,
  AppointmentStatus,
  Client,
  Expense,
  AjodunEvent,
  BlogPost,
  ChecklistItem,
  EducationItem,
  HierarchyPerson,
  InternalNote,
  LibraryItem,
  LibraryKind,
  Member,
  Message,
  MonthlyFee,
  Payment,
  PaymentMethod,
  PhotoAlbum,
  Profile,
  PublishedSlot,
  StockLot,
  StockMovement,
  StockProduct,
  UserRole,
} from "@/types";
import { canManageHouseContent, canManageLibrary } from "@/lib/permissions";
import { formatAudioDuration } from "@/lib/chat";
import { freedSlotMessage, isSlotOccupied } from "@/lib/slots";
import { findProductByBarcode, pickLotsForWithdrawal } from "@/lib/stock";

type AppStore = {
  ready: boolean;
  state: AppState;
  currentUser: Profile | null;
  loginDemo: (role: UserRole) => void;
  login: (email: string, password: string) => {
    ok: boolean;
    error?: string;
    role?: UserRole;
  };
  logout: () => void;
  resetDemo: () => void;
  updateProfile: (input: {
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string | null;
  }) => { ok: true; profile: Profile } | { ok: false; error: string };
  upsertMember: (member: Omit<Member, "id" | "created_at" | "updated_at"> & { id?: string }) => Member;
  generateFee: (memberId: string, competence: string) => MonthlyFee | null;
  confirmFeePayment: (
    feeId: string,
    input: { method: PaymentMethod; amount: number; observation?: string },
  ) => MonthlyFee | null;
  upsertExpense: (expense: Omit<Expense, "id" | "created_at" | "updated_at"> & { id?: string }) => Expense;
  upsertClient: (client: Omit<Client, "id" | "created_at" | "updated_at"> & { id?: string }) => Client;
  saveClientRegistration: (input: {
    full_name: string;
    birth_date: string;
    phone: string;
    email?: string;
  }) => { ok: true } | { ok: false; error: string };
  createAppointment: (input: {
    client_id: string;
    scheduled_at: string;
    duration_minutes?: number;
    amount?: number;
  }) => { ok: true; appointment: Appointment } | { ok: false; error: string };
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Appointment | null;
  cancelAppointment: (id: string) => Appointment | null;
  startAppointment: (id: string) => Appointment | null;
  finishAppointment: (id: string) => Appointment | null;
  addPublishedSlot: (input: {
    scheduled_at: string;
    duration_minutes?: number;
    note?: string;
  }) => { ok: true } | { ok: false; error: string };
  removePublishedSlot: (id: string) => void;
  sendMessage: (input: {
    client_id: string;
    body?: string;
    appointment_id?: string;
    kind?: "text" | "audio";
    audio_data_url?: string;
    audio_duration_sec?: number;
  }) => Message | null;
  addInternalNote: (client_id: string, body: string) => InternalNote | null;
  markNotificationRead: (id: string) => void;
  addNotification: (n: Omit<AppNotification, "id" | "created_at" | "read">) => void;
  savePaymentRecord: (payment: Payment) => void;
  upsertStockProduct: (
    input: Omit<StockProduct, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => StockProduct;
  stockEntry: (input: {
    barcode: string;
    name?: string;
    unit?: string;
    category?: string;
    quantity: number;
    expires_at: string;
    batch_code?: string;
    note?: string;
  }) => { ok: true; product: StockProduct; lot: StockLot } | { ok: false; error: string };
  stockExit: (input: {
    barcode: string;
    quantity: number;
    note?: string;
  }) => { ok: true; product: StockProduct } | { ok: false; error: string };
  upsertLibraryItem: (input: {
    id?: string;
    title: string;
    description?: string;
    kind: LibraryKind;
    external_url?: string;
    file_data_url?: string;
    file_name?: string;
    mime_type?: string;
    visible_to_clients: boolean;
  }) => { ok: true; item: LibraryItem } | { ok: false; error: string };
  removeLibraryItem: (id: string) => void;
  upsertBlogPost: (
    input: Omit<BlogPost, "id" | "created_at" | "updated_at" | "author_name"> & {
      id?: string;
      author_name?: string;
    },
  ) => { ok: true; item: BlogPost } | { ok: false; error: string };
  removeBlogPost: (id: string) => void;
  upsertEducationItem: (
    input: Omit<EducationItem, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => { ok: true; item: EducationItem } | { ok: false; error: string };
  removeEducationItem: (id: string) => void;
  upsertHierarchyPerson: (
    input: Omit<HierarchyPerson, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => { ok: true; item: HierarchyPerson } | { ok: false; error: string };
  removeHierarchyPerson: (id: string) => void;
  upsertChecklistItem: (
    input: Omit<ChecklistItem, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => { ok: true; item: ChecklistItem } | { ok: false; error: string };
  removeChecklistItem: (id: string) => void;
  toggleChecklistProgress: (itemId: string) => void;
  upsertAjodunEvent: (
    input: Omit<AjodunEvent, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => { ok: true; item: AjodunEvent } | { ok: false; error: string };
  removeAjodunEvent: (id: string) => void;
  toggleAjodunTask: (eventId: string, taskId: string) => void;
  upsertPhotoAlbum: (
    input: Omit<PhotoAlbum, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => { ok: true; item: PhotoAlbum } | { ok: false; error: string };
  removePhotoAlbum: (id: string) => void;
};

const AppStoreContext = createContext<AppStore | null>(null);

function toAppState(data: SharedData, currentUserId: string | null): AppState {
  return { ...data, currentUserId };
}

export function AppStoreProvider({
  children,
  initialUserId = null,
}: {
  children: ReactNode;
  initialUserId?: string | null;
}) {
  // Providers só monta no cliente → podemos ler storage já no 1º render
  const [state, setState] = useState<AppState>(() =>
    toAppState(loadSharedData(), loadSessionUserId() ?? initialUserId),
  );
  const [ready, setReady] = useState(true);

  useEffect(() => {
    // Re-sincroniza (outra aba pode ter gravado dados)
    try {
      const data = loadSharedData();
      const userId = loadSessionUserId();
      setState(toAppState(data, userId));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  // Sincroniza dados entre abas (Casa ↔ Cliente)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== DATA_KEY || !e.newValue) return;
      try {
        const shared = JSON.parse(e.newValue) as SharedData;
        setState((prev) => toAppState(shared, prev.currentUserId));
      } catch {
        // ignore
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      persistSharedData(stripSession(next));
      persistSessionUserId(next.currentUserId);
      return next;
    });
  }, []);

  const currentUser = useMemo(
    () => state.profiles.find((p) => p.id === state.currentUserId) ?? null,
    [state.profiles, state.currentUserId],
  );

  const loginDemo = useCallback(
    (role: UserRole) => {
      commit((prev) => {
        const profile = prev.profiles.find((p) => p.role === role);
        return { ...prev, currentUserId: profile?.id ?? null };
      });
    },
    [commit],
  );

  const login = useCallback(
    (email: string, password: string) => {
      if (password !== DEMO_PASSWORD) {
        return { ok: false, error: "Senha inválida. Use demo123 no modo demonstração." };
      }
      const profile = state.profiles.find(
        (p) => p.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!profile) return { ok: false, error: "Usuário não encontrado." };
      commit((prev) => ({ ...prev, currentUserId: profile.id }));
      return { ok: true, role: profile.role };
    },
    [commit, state.profiles],
  );

  const logout = useCallback(() => {
    commit((prev) => ({ ...prev, currentUserId: null }));
  }, [commit]);

  const resetDemo = useCallback(() => {
    const seed = createSeedState();
    persistSharedData(stripSession(seed));
    setState((prev) => toAppState(stripSession(seed), prev.currentUserId));
  }, []);

  const updateProfile: AppStore["updateProfile"] = useCallback(
    (input) => {
      if (!currentUser) return { ok: false, error: "Faça login para editar o perfil." };
      const full_name = input.full_name.trim();
      const email = input.email.trim().toLowerCase();
      if (full_name.length < 2) {
        return { ok: false, error: "Informe o nome completo." };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "E-mail inválido." };
      }

      let saved: Profile | null = null;
      let conflict = false;
      commit((prev) => {
        const taken = prev.profiles.some(
          (p) => p.id !== currentUser.id && p.email.toLowerCase() === email,
        );
        if (taken) {
          conflict = true;
          return prev;
        }
        saved = {
          ...currentUser,
          full_name,
          email,
          phone: input.phone?.trim() || undefined,
          avatar_url:
            input.avatar_url === null || input.avatar_url === undefined
              ? undefined
              : input.avatar_url,
          updated_at: nowIso(),
        };
        // remove avatar when explicitly cleared
        if (input.avatar_url === null || input.avatar_url === "") {
          saved = { ...saved, avatar_url: undefined };
        }
        return {
          ...prev,
          profiles: prev.profiles.map((p) => (p.id === currentUser.id ? saved! : p)),
        };
      });
      if (conflict) return { ok: false, error: "Este e-mail já está em uso." };
      if (!saved) return { ok: false, error: "Não foi possível salvar." };
      return { ok: true, profile: saved };
    },
    [commit, currentUser],
  );

  const upsertMember: AppStore["upsertMember"] = useCallback(
    (input) => {
      const stamp = nowIso();
      let saved!: Member;
      commit((prev) => {
        if (input.id) {
          saved = {
            ...(prev.members.find((m) => m.id === input.id) as Member),
            ...input,
            id: input.id,
            updated_at: stamp,
          };
          return {
            ...prev,
            members: prev.members.map((m) => (m.id === input.id ? saved : m)),
          };
        }
        saved = {
          ...input,
          id: uid("mem"),
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, members: [saved, ...prev.members] };
      });
      return saved;
    },
    [commit],
  );

  const generateFee: AppStore["generateFee"] = useCallback(
    (memberId, competence) => {
      let created: MonthlyFee | null = null;
      commit((prev) => {
        const member = prev.members.find((m) => m.id === memberId);
        if (!member) return prev;
        const exists = prev.monthlyFees.find(
          (f) => f.member_id === memberId && f.competence === competence,
        );
        if (exists) {
          created = exists;
          return prev;
        }
        const [y, m] = competence.split("-").map(Number);
        const last = new Date(y, m, 0).getDate();
        const day = Math.min(member.due_day, last);
        const stamp = nowIso();
        created = {
          id: uid("fee"),
          member_id: memberId,
          competence,
          amount: member.monthly_fee_amount,
          due_date: `${competence}-${String(day).padStart(2, "0")}`,
          status: member.status === "isento" ? "ISENTO" : "AGUARDANDO",
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, monthlyFees: [created, ...prev.monthlyFees] };
      });
      return created;
    },
    [commit],
  );

  const confirmFeePayment: AppStore["confirmFeePayment"] = useCallback(
    (feeId, input) => {
      let updated: MonthlyFee | null = null;
      commit((prev) => {
        const fee = prev.monthlyFees.find((f) => f.id === feeId);
        if (!fee) return prev;
        const stamp = nowIso();
        updated = {
          ...fee,
          status: "PAGO",
          paid_at: stamp,
          payment_method: input.method,
          amount_received: input.amount,
          observation: input.observation,
          updated_at: stamp,
        };
        const member = prev.members.find((m) => m.id === fee.member_id);
        const notification: AppNotification = {
          id: uid("ntf"),
          title: "Pagamento confirmado",
          body: `${member?.full_name ?? "Membro"} — ${fee.competence}.`,
          type: "financeiro",
          audience: ["tesouraria", "administrador"],
          read: false,
          href: `/membros/${fee.member_id}`,
          created_at: stamp,
        };
        return {
          ...prev,
          monthlyFees: prev.monthlyFees.map((f) => (f.id === feeId ? updated! : f)),
          notifications: [notification, ...prev.notifications],
        };
      });
      return updated;
    },
    [commit],
  );

  const upsertExpense: AppStore["upsertExpense"] = useCallback(
    (input) => {
      const stamp = nowIso();
      let saved!: Expense;
      commit((prev) => {
        if (input.id) {
          saved = {
            ...(prev.expenses.find((e) => e.id === input.id) as Expense),
            ...input,
            id: input.id,
            updated_at: stamp,
          };
          return {
            ...prev,
            expenses: prev.expenses.map((e) => (e.id === input.id ? saved : e)),
          };
        }
        saved = { ...input, id: uid("exp"), created_at: stamp, updated_at: stamp };
        return { ...prev, expenses: [saved, ...prev.expenses] };
      });
      return saved;
    },
    [commit],
  );

  const upsertClient: AppStore["upsertClient"] = useCallback(
    (input) => {
      const stamp = nowIso();
      let saved!: Client;
      commit((prev) => {
        if (input.id) {
          saved = {
            ...(prev.clients.find((c) => c.id === input.id) as Client),
            ...input,
            id: input.id,
            updated_at: stamp,
          };
          return {
            ...prev,
            clients: prev.clients.map((c) => (c.id === input.id ? saved : c)),
          };
        }
        saved = { ...input, id: uid("cli"), created_at: stamp, updated_at: stamp };
        return { ...prev, clients: [saved, ...prev.clients] };
      });
      return saved;
    },
    [commit],
  );

  const saveClientRegistration: AppStore["saveClientRegistration"] = useCallback(
    (input) => {
      if (!currentUser || currentUser.role !== "cliente" || !currentUser.client_id) {
        return { ok: false, error: "Entre no App do Cliente para se cadastrar." };
      }
      const full_name = input.full_name.trim();
      const phone = input.phone.trim();
      const birth_date = input.birth_date.trim();
      const email = input.email?.trim().toLowerCase();
      if (full_name.length < 3) {
        return { ok: false, error: "Informe o nome completo." };
      }
      if (!birth_date || Number.isNaN(Date.parse(birth_date))) {
        return { ok: false, error: "Informe a data de nascimento." };
      }
      if (phone.length < 8) {
        return { ok: false, error: "Informe um telefone válido." };
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "E-mail inválido." };
      }

      const stamp = nowIso();
      commit((prev) => {
        const clientId = currentUser.client_id!;
        return {
          ...prev,
          clients: prev.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  full_name,
                  phone,
                  email: email || c.email,
                  birth_date,
                  registration_complete: true,
                  updated_at: stamp,
                }
              : c,
          ),
          profiles: prev.profiles.map((p) =>
            p.id === currentUser.id
              ? {
                  ...p,
                  full_name,
                  email: email || p.email,
                  phone,
                  updated_at: stamp,
                }
              : p,
          ),
        };
      });
      return { ok: true };
    },
    [commit, currentUser],
  );

  const createAppointment: AppStore["createAppointment"] = useCallback(
    (input) => {
      let result: ReturnType<AppStore["createAppointment"]> = {
        ok: false,
        error: "Falha ao criar.",
      };
      commit((prev) => {
        const published = (prev.publishedSlots ?? []).some(
          (s) => s.scheduled_at === input.scheduled_at,
        );
        if (!published) {
          result = { ok: false, error: "Este horário não está disponível na agenda da casa." };
          return prev;
        }
        if (isSlotOccupied(input.scheduled_at, prev.appointments)) {
          result = { ok: false, error: "Este horário já está ocupado." };
          return prev;
        }
        const stamp = nowIso();
        const slot = prev.publishedSlots.find((s) => s.scheduled_at === input.scheduled_at);
        const appointment: Appointment = {
          id: uid("apt"),
          client_id: input.client_id,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes ?? slot?.duration_minutes ?? 60,
          status: "SOLICITADO",
          amount: input.amount ?? 150,
          created_at: stamp,
          updated_at: stamp,
        };
        const client = prev.clients.find((c) => c.id === input.client_id);
        const notification: AppNotification = {
          id: uid("ntf"),
          title: "Novo agendamento recebido",
          body: `${client?.full_name ?? "Cliente"} solicitou atendimento.`,
          type: "agenda",
          audience: ["pai_de_santo", "administrador"],
          read: false,
          href: "/agenda",
          created_at: stamp,
        };
        result = { ok: true, appointment };
        return {
          ...prev,
          appointments: [appointment, ...prev.appointments],
          notifications: [notification, ...prev.notifications],
        };
      });
      return result;
    },
    [commit],
  );

  const updateAppointmentStatus: AppStore["updateAppointmentStatus"] = useCallback(
    (id, status) => {
      let updated: Appointment | null = null;
      commit((prev) => {
        const current = prev.appointments.find((a) => a.id === id);
        if (!current) return prev;
        updated = { ...current, status, updated_at: nowIso() };
        return {
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? updated! : a)),
        };
      });
      return updated;
    },
    [commit],
  );

  const cancelAppointment: AppStore["cancelAppointment"] = useCallback(
    (id) => {
      let updated: Appointment | null = null;
      commit((prev) => {
        const current = prev.appointments.find((a) => a.id === id);
        if (!current) return prev;
        if (["CANCELADO", "REALIZADO", "NAO_COMPARECEU"].includes(current.status)) {
          updated = current;
          return prev;
        }
        const stamp = nowIso();
        updated = { ...current, status: "CANCELADO", updated_at: stamp };
        const client = prev.clients.find((c) => c.id === current.client_id);
        const broadcast: AppNotification = {
          id: uid("ntf"),
          title: "Horário liberado",
          body: freedSlotMessage(current.scheduled_at),
          type: "agenda",
          audience: ["cliente"],
          read: false,
          href: "/cliente/horarios",
          created_at: stamp,
        };
        const staffNote: AppNotification = {
          id: uid("ntf"),
          title: "Consulta cancelada",
          body: `${client?.full_name ?? "Cliente"} cancelou ${freedSlotMessage(current.scheduled_at).replace("Horário liberado: ", "")}`,
          type: "agenda",
          audience: ["pai_de_santo", "administrador"],
          read: false,
          href: "/agenda",
          created_at: stamp,
        };
        return {
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? updated! : a)),
          notifications: [broadcast, staffNote, ...prev.notifications],
        };
      });
      return updated;
    },
    [commit],
  );

  const addPublishedSlot: AppStore["addPublishedSlot"] = useCallback(
    (input) => {
      let result: ReturnType<AppStore["addPublishedSlot"]> = { ok: false, error: "Falha." };
      commit((prev) => {
        const slots = prev.publishedSlots ?? [];
        if (slots.some((s) => s.scheduled_at === input.scheduled_at)) {
          result = { ok: false, error: "Este horário já foi publicado." };
          return prev;
        }
        if (new Date(input.scheduled_at).getTime() < Date.now()) {
          result = { ok: false, error: "Não é possível publicar horário no passado." };
          return prev;
        }
        const stamp = nowIso();
        const slot: PublishedSlot = {
          id: uid("slot"),
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes ?? 60,
          note: input.note,
          created_at: stamp,
          updated_at: stamp,
        };
        const notification: AppNotification = {
          id: uid("ntf"),
          title: "Novo horário disponível",
          body: freedSlotMessage(input.scheduled_at).replace("liberado", "disponível"),
          type: "agenda",
          audience: ["cliente"],
          read: false,
          href: "/cliente/horarios",
          created_at: stamp,
        };
        result = { ok: true };
        return {
          ...prev,
          publishedSlots: [...slots, slot],
          notifications: [notification, ...prev.notifications],
        };
      });
      return result;
    },
    [commit],
  );

  const removePublishedSlot: AppStore["removePublishedSlot"] = useCallback(
    (id) => {
      commit((prev) => {
        const slot = (prev.publishedSlots ?? []).find((s) => s.id === id);
        if (!slot) return prev;
        if (isSlotOccupied(slot.scheduled_at, prev.appointments)) {
          return prev;
        }
        return {
          ...prev,
          publishedSlots: prev.publishedSlots.filter((s) => s.id !== id),
        };
      });
    },
    [commit],
  );

  const startAppointment: AppStore["startAppointment"] = useCallback(
    (id) => {
      let updated: Appointment | null = null;
      commit((prev) => {
        const current = prev.appointments.find((a) => a.id === id);
        if (!current) return prev;
        const stamp = nowIso();
        updated = {
          ...current,
          status: "EM_ATENDIMENTO",
          started_at: stamp,
          updated_at: stamp,
        };
        return {
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? updated! : a)),
        };
      });
      return updated;
    },
    [commit],
  );

  const finishAppointment: AppStore["finishAppointment"] = useCallback(
    (id) => {
      let updated: Appointment | null = null;
      commit((prev) => {
        const current = prev.appointments.find((a) => a.id === id);
        if (!current) return prev;
        const stamp = nowIso();
        updated = {
          ...current,
          status: "REALIZADO",
          ended_at: stamp,
          started_at: current.started_at ?? stamp,
          updated_at: stamp,
        };
        return {
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? updated! : a)),
        };
      });
      return updated;
    },
    [commit],
  );

  const sendMessage: AppStore["sendMessage"] = useCallback(
    (input) => {
      if (!currentUser) return null;
      const kind = input.kind ?? (input.audio_data_url ? "audio" : "text");
      if (kind === "audio" && !input.audio_data_url) return null;
      if (kind === "text" && !input.body?.trim()) return null;

      const stamp = nowIso();
      const durationSec = input.audio_duration_sec;
      const audioLabel =
        typeof durationSec === "number"
          ? `Áudio · ${formatAudioDuration(durationSec)}`
          : "Áudio";
      const body = kind === "audio" ? audioLabel : input.body!.trim();

      const message: Message = {
        id: uid("msg"),
        client_id: input.client_id,
        sender_role: currentUser.role,
        sender_name: currentUser.full_name,
        body,
        kind,
        audio_data_url: kind === "audio" ? input.audio_data_url : undefined,
        audio_duration_sec: kind === "audio" ? durationSec : undefined,
        appointment_id: input.appointment_id,
        created_at: stamp,
      };

      const clientName =
        currentUser.role === "cliente"
          ? currentUser.full_name
          : undefined;

      commit((prev) => {
        const client = prev.clients.find((c) => c.id === input.client_id);
        const fromClient = currentUser.role === "cliente";
        const notification: AppNotification = {
          id: uid("ntf"),
          title: fromClient ? "Nova mensagem do cliente" : "Nova mensagem da casa",
          body: fromClient
            ? `${clientName ?? client?.full_name ?? "Cliente"}: ${body}`
            : `${currentUser.full_name}: ${body}`,
          type: "chat",
          audience: fromClient
            ? ["pai_de_santo", "administrador"]
            : ["cliente"],
          read: false,
          href: fromClient ? `/conversas/${input.client_id}` : `/cliente/mensagens`,
          created_at: stamp,
        };
        return {
          ...prev,
          messages: [...prev.messages, message],
          notifications: [notification, ...prev.notifications],
        };
      });
      return message;
    },
    [commit, currentUser],
  );

  const addInternalNote: AppStore["addInternalNote"] = useCallback(
    (client_id, body) => {
      if (!currentUser || currentUser.role === "cliente") return null;
      const note: InternalNote = {
        id: uid("note"),
        client_id,
        author_name: currentUser.full_name,
        body,
        created_at: nowIso(),
      };
      commit((prev) => ({ ...prev, internalNotes: [note, ...prev.internalNotes] }));
      return note;
    },
    [commit, currentUser],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      }));
    },
    [commit],
  );

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "created_at" | "read">) => {
      commit((prev) => ({
        ...prev,
        notifications: [
          { ...n, id: uid("ntf"), created_at: nowIso(), read: false },
          ...prev.notifications,
        ],
      }));
    },
    [commit],
  );

  const savePaymentRecord = useCallback(
    (payment: Payment) => {
      commit((prev) => ({ ...prev, payments: [payment, ...prev.payments] }));
    },
    [commit],
  );

  const upsertStockProduct: AppStore["upsertStockProduct"] = useCallback(
    (input) => {
      const stamp = nowIso();
      let saved!: StockProduct;
      commit((prev) => {
        const products = prev.stockProducts ?? [];
        if (input.id) {
          saved = {
            ...(products.find((p) => p.id === input.id) as StockProduct),
            ...input,
            id: input.id,
            updated_at: stamp,
          };
          return {
            ...prev,
            stockProducts: products.map((p) => (p.id === input.id ? saved : p)),
          };
        }
        const existing = findProductByBarcode(products, input.barcode);
        if (existing) {
          saved = { ...existing, ...input, id: existing.id, updated_at: stamp };
          return {
            ...prev,
            stockProducts: products.map((p) => (p.id === existing.id ? saved : p)),
          };
        }
        saved = {
          ...input,
          id: uid("stk"),
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, stockProducts: [saved, ...products] };
      });
      return saved;
    },
    [commit],
  );

  const stockEntry: AppStore["stockEntry"] = useCallback(
    (input) => {
      let result: ReturnType<AppStore["stockEntry"]> = { ok: false, error: "Falha." };
      if (!currentUser) return { ok: false, error: "Faça login para registrar entrada." };
      if (input.quantity <= 0) return { ok: false, error: "Quantidade inválida." };
      if (!input.expires_at) return { ok: false, error: "Informe a validade." };

      commit((prev) => {
        const stamp = nowIso();
        const products = prev.stockProducts ?? [];
        const lots = prev.stockLots ?? [];
        const barcode = input.barcode.trim();
        let product = findProductByBarcode(products, barcode);

        if (!product) {
          if (!input.name?.trim()) {
            result = {
              ok: false,
              error: "Produto novo: informe o nome após ler o código.",
            };
            return prev;
          }
          product = {
            id: uid("stk"),
            barcode,
            name: input.name.trim(),
            unit: input.unit?.trim() || "un",
            category: input.category,
            created_at: stamp,
            updated_at: stamp,
          };
        } else if (input.name?.trim()) {
          product = {
            ...product,
            name: input.name.trim(),
            unit: input.unit?.trim() || product.unit,
            category: input.category ?? product.category,
            updated_at: stamp,
          };
        }

        const sameLot = lots.find(
          (l) =>
            l.product_id === product!.id &&
            l.expires_at === input.expires_at &&
            (l.batch_code ?? "") === (input.batch_code ?? ""),
        );

        let lot: StockLot;
        let nextLots: StockLot[];
        if (sameLot) {
          lot = {
            ...sameLot,
            quantity: sameLot.quantity + input.quantity,
            updated_at: stamp,
          };
          nextLots = lots.map((l) => (l.id === sameLot.id ? lot : l));
        } else {
          lot = {
            id: uid("lot"),
            product_id: product.id,
            barcode,
            quantity: input.quantity,
            expires_at: input.expires_at,
            batch_code: input.batch_code,
            created_at: stamp,
            updated_at: stamp,
          };
          nextLots = [lot, ...lots];
        }

        const movement: StockMovement = {
          id: uid("mov"),
          product_id: product.id,
          lot_id: lot.id,
          barcode,
          type: "entrada",
          quantity: input.quantity,
          expires_at: input.expires_at,
          performed_by: currentUser.full_name,
          note: input.note,
          created_at: stamp,
        };

        const nextProducts = products.some((p) => p.id === product!.id)
          ? products.map((p) => (p.id === product!.id ? product! : p))
          : [product, ...products];

        result = { ok: true, product, lot };
        return {
          ...prev,
          stockProducts: nextProducts,
          stockLots: nextLots,
          stockMovements: [movement, ...(prev.stockMovements ?? [])],
          notifications: [
            {
              id: uid("ntf"),
              title: "Entrada no estoque",
              body: `${product.name}: +${input.quantity} ${product.unit} · val. ${input.expires_at}`,
              type: "estoque",
              audience: ["estoque", "administrador"],
              read: false,
              href: "/estoque",
              created_at: stamp,
            },
            ...prev.notifications,
          ],
        };
      });
      return result;
    },
    [commit, currentUser],
  );

  const stockExit: AppStore["stockExit"] = useCallback(
    (input) => {
      let result: ReturnType<AppStore["stockExit"]> = { ok: false, error: "Falha." };
      if (!currentUser) return { ok: false, error: "Faça login para registrar saída." };
      if (input.quantity <= 0) return { ok: false, error: "Quantidade inválida." };

      commit((prev) => {
        const stamp = nowIso();
        const barcode = input.barcode.trim();
        const product = findProductByBarcode(prev.stockProducts ?? [], barcode);
        if (!product) {
          result = { ok: false, error: "Código não cadastrado no estoque." };
          return prev;
        }

        const { ok, remaining, plan } = pickLotsForWithdrawal(
          prev.stockLots ?? [],
          product.id,
          input.quantity,
        );
        if (!ok) {
          result = {
            ok: false,
            error: `Estoque insuficiente. Faltam ${remaining} ${product.unit}.`,
          };
          return prev;
        }

        let nextLots = prev.stockLots ?? [];
        const movements: StockMovement[] = [];
        for (const step of plan) {
          nextLots = nextLots.map((l) =>
            l.id === step.lot.id
              ? { ...l, quantity: l.quantity - step.take, updated_at: stamp }
              : l,
          );
          movements.push({
            id: uid("mov"),
            product_id: product.id,
            lot_id: step.lot.id,
            barcode,
            type: "saida",
            quantity: step.take,
            expires_at: step.lot.expires_at,
            performed_by: currentUser.full_name,
            note: input.note,
            created_at: stamp,
          });
        }

        result = { ok: true, product };
        return {
          ...prev,
          stockLots: nextLots,
          stockMovements: [...movements, ...(prev.stockMovements ?? [])],
          notifications: [
            {
              id: uid("ntf"),
              title: "Baixa de estoque",
              body: `${product.name}: −${input.quantity} ${product.unit} (código ${barcode})`,
              type: "estoque",
              audience: ["estoque", "administrador"],
              read: false,
              href: "/estoque",
              created_at: stamp,
            },
            ...prev.notifications,
          ],
        };
      });
      return result;
    },
    [commit, currentUser],
  );

  const upsertLibraryItem: AppStore["upsertLibraryItem"] = useCallback(
    (input) => {
      if (!currentUser || !canManageLibrary(currentUser.role)) {
        return {
          ok: false,
          error: "Só quem tem a aba Biblioteca, Pai de Santo ou Administrador publica aqui.",
        };
      }
      const title = input.title.trim();
      if (title.length < 2) return { ok: false, error: "Informe o título do material." };
      const external = input.external_url?.trim() || undefined;
      const hasFile = Boolean(input.file_data_url);
      if (!external && !hasFile) {
        return {
          ok: false,
          error: "Envie um arquivo ou cole um link (YouTube, Drive, áudio online…).",
        };
      }

      const stamp = nowIso();
      let saved!: LibraryItem;
      commit((prev) => {
        const items = prev.libraryItems ?? [];
        if (input.id) {
          const current = items.find((i) => i.id === input.id);
          if (!current) return prev;
          saved = {
            ...current,
            title,
            description: input.description?.trim() || undefined,
            kind: input.kind,
            external_url: external,
            file_data_url: input.file_data_url ?? current.file_data_url,
            file_name: input.file_name ?? current.file_name,
            mime_type: input.mime_type ?? current.mime_type,
            visible_to_clients: input.visible_to_clients,
            updated_at: stamp,
          };
          // limpar arquivo se só link
          if (external && input.file_data_url === undefined && !input.file_name) {
            // keep existing file unless explicitly replaced
          }
          if (input.file_data_url === "") {
            saved = {
              ...saved,
              file_data_url: undefined,
              file_name: undefined,
              mime_type: undefined,
            };
          }
          return {
            ...prev,
            libraryItems: items.map((i) => (i.id === input.id ? saved : i)),
          };
        }

        saved = {
          id: uid("lib"),
          title,
          description: input.description?.trim() || undefined,
          kind: input.kind,
          external_url: external,
          file_data_url: input.file_data_url,
          file_name: input.file_name,
          mime_type: input.mime_type,
          visible_to_clients: input.visible_to_clients,
          uploaded_by: currentUser.id,
          uploaded_by_name: currentUser.full_name,
          created_at: stamp,
          updated_at: stamp,
        };

        const notifications = [...prev.notifications];
        if (input.visible_to_clients) {
          notifications.unshift({
            id: uid("ntf"),
            title: "Novo material na biblioteca",
            body: `${saved.kind === "cantiga" ? "Cantiga" : saved.kind === "pdf" ? "PDF" : saved.kind === "video" ? "Vídeo" : "Material"}: ${saved.title}`,
            type: "biblioteca",
            audience: ["cliente"],
            read: false,
            href: `/cliente/biblioteca`,
            created_at: stamp,
          });
        }

        return {
          ...prev,
          libraryItems: [saved, ...items],
          notifications,
        };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const removeLibraryItem: AppStore["removeLibraryItem"] = useCallback(
    (id) => {
      if (!currentUser || !canManageLibrary(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        libraryItems: (prev.libraryItems ?? []).filter((i) => i.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const upsertBlogPost: AppStore["upsertBlogPost"] = useCallback(
    (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar Quem Somos." };
      }
      const title = input.title.trim();
      const body = input.body.trim();
      if (title.length < 2 || body.length < 2) {
        return { ok: false, error: "Título e texto são obrigatórios." };
      }
      const stamp = nowIso();
      let saved!: BlogPost;
      commit((prev) => {
        const list = prev.blogPosts ?? [];
        if (input.id) {
          const cur = list.find((p) => p.id === input.id);
          if (!cur) return prev;
          saved = {
            ...cur,
            ...input,
            id: cur.id,
            title,
            body,
            excerpt: input.excerpt?.trim() || undefined,
            author_name: input.author_name?.trim() || cur.author_name,
            updated_at: stamp,
          };
          return { ...prev, blogPosts: list.map((p) => (p.id === cur.id ? saved : p)) };
        }
        saved = {
          id: uid("blog"),
          title,
          body,
          excerpt: input.excerpt?.trim() || undefined,
          category: input.category,
          cover_url: input.cover_url,
          author_name: input.author_name?.trim() || currentUser.full_name,
          published: input.published,
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, blogPosts: [saved, ...list] };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const removeBlogPost: AppStore["removeBlogPost"] = useCallback(
    (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        blogPosts: (prev.blogPosts ?? []).filter((p) => p.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const upsertEducationItem: AppStore["upsertEducationItem"] = useCallback(
    (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar Educação." };
      }
      const title = input.title.trim();
      if (title.length < 2) return { ok: false, error: "Informe o título." };
      const stamp = nowIso();
      let saved!: EducationItem;
      commit((prev) => {
        const list = prev.educationItems ?? [];
        if (input.id) {
          const cur = list.find((p) => p.id === input.id);
          if (!cur) return prev;
          saved = { ...cur, ...input, id: cur.id, title, updated_at: stamp };
          return {
            ...prev,
            educationItems: list.map((p) => (p.id === cur.id ? saved : p)),
          };
        }
        saved = {
          id: uid("edu"),
          title,
          description: input.description?.trim() || undefined,
          kind: input.kind,
          url: input.url?.trim() || undefined,
          author_or_source: input.author_or_source?.trim() || undefined,
          published: input.published,
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, educationItems: [saved, ...list] };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const removeEducationItem: AppStore["removeEducationItem"] = useCallback(
    (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        educationItems: (prev.educationItems ?? []).filter((p) => p.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const upsertHierarchyPerson: AppStore["upsertHierarchyPerson"] = useCallback(
    (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar a hierarquia." };
      }
      const full_name = input.full_name.trim();
      if (full_name.length < 2) return { ok: false, error: "Informe o nome." };
      const stamp = nowIso();
      let saved!: HierarchyPerson;
      commit((prev) => {
        const list = prev.hierarchyPeople ?? [];
        if (input.id) {
          const cur = list.find((p) => p.id === input.id);
          if (!cur) return prev;
          saved = {
            ...cur,
            ...input,
            id: cur.id,
            full_name,
            parent_id: input.parent_id || null,
            updated_at: stamp,
          };
          return {
            ...prev,
            hierarchyPeople: list.map((p) => (p.id === cur.id ? saved : p)),
          };
        }
        saved = {
          id: uid("hier"),
          full_name,
          office: input.office,
          office_label: input.office_label?.trim() || undefined,
          photo_url: input.photo_url,
          parent_id: input.parent_id || null,
          bio: input.bio?.trim() || undefined,
          sort_order: input.sort_order ?? list.length,
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, hierarchyPeople: [...list, saved] };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const removeHierarchyPerson: AppStore["removeHierarchyPerson"] = useCallback(
    (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        hierarchyPeople: (prev.hierarchyPeople ?? [])
          .filter((p) => p.id !== id)
          .map((p) => (p.parent_id === id ? { ...p, parent_id: null } : p)),
      }));
    },
    [commit, currentUser],
  );

  const upsertChecklistItem: AppStore["upsertChecklistItem"] = useCallback(
    (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar o checklist." };
      }
      const title = input.title.trim();
      const body = input.body.trim();
      if (title.length < 2 || body.length < 2) {
        return { ok: false, error: "Título e texto são obrigatórios." };
      }
      const stamp = nowIso();
      let saved!: ChecklistItem;
      commit((prev) => {
        const list = prev.checklistItems ?? [];
        if (input.id) {
          const cur = list.find((p) => p.id === input.id);
          if (!cur) return prev;
          saved = { ...cur, ...input, id: cur.id, title, body, updated_at: stamp };
          return {
            ...prev,
            checklistItems: list.map((p) => (p.id === cur.id ? saved : p)),
          };
        }
        saved = {
          id: uid("chk"),
          level: input.level,
          topic: input.topic,
          title,
          body,
          sort_order: input.sort_order ?? list.length + 1,
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, checklistItems: [...list, saved] };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const removeChecklistItem: AppStore["removeChecklistItem"] = useCallback(
    (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        checklistItems: (prev.checklistItems ?? []).filter((p) => p.id !== id),
        checklistProgress: (prev.checklistProgress ?? []).filter((p) => p.item_id !== id),
      }));
    },
    [commit, currentUser],
  );

  const toggleChecklistProgress: AppStore["toggleChecklistProgress"] = useCallback(
    (itemId) => {
      if (!currentUser) return;
      const stamp = nowIso();
      commit((prev) => {
        const list = prev.checklistProgress ?? [];
        const existing = list.find(
          (p) => p.user_id === currentUser.id && p.item_id === itemId,
        );
        if (existing) {
          return {
            ...prev,
            checklistProgress: list.map((p) =>
              p === existing ? { ...p, done: !p.done, updated_at: stamp } : p,
            ),
          };
        }
        return {
          ...prev,
          checklistProgress: [
            ...list,
            { user_id: currentUser.id, item_id: itemId, done: true, updated_at: stamp },
          ],
        };
      });
    },
    [commit, currentUser],
  );

  const upsertAjodunEvent: AppStore["upsertAjodunEvent"] = useCallback(
    (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar Ajodun." };
      }
      const title = input.title.trim();
      if (title.length < 2) return { ok: false, error: "Informe o título." };
      const stamp = nowIso();
      let saved!: AjodunEvent;
      commit((prev) => {
        const list = prev.ajodunEvents ?? [];
        if (input.id) {
          const cur = list.find((p) => p.id === input.id);
          if (!cur) return prev;
          saved = { ...cur, ...input, id: cur.id, title, updated_at: stamp };
          return {
            ...prev,
            ajodunEvents: list.map((p) => (p.id === cur.id ? saved : p)),
          };
        }
        saved = {
          id: uid("ajo"),
          title,
          theme: input.theme?.trim() || undefined,
          scheduled_at: input.scheduled_at,
          notes: input.notes?.trim() || undefined,
          sheet_url: input.sheet_url?.trim() || undefined,
          tasks: input.tasks ?? [],
          published: input.published,
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, ajodunEvents: [saved, ...list] };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const removeAjodunEvent: AppStore["removeAjodunEvent"] = useCallback(
    (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        ajodunEvents: (prev.ajodunEvents ?? []).filter((p) => p.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const toggleAjodunTask: AppStore["toggleAjodunTask"] = useCallback(
    (eventId, taskId) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        ajodunEvents: (prev.ajodunEvents ?? []).map((ev) =>
          ev.id !== eventId
            ? ev
            : {
                ...ev,
                updated_at: nowIso(),
                tasks: ev.tasks.map((t) =>
                  t.id === taskId ? { ...t, done: !t.done } : t,
                ),
              },
        ),
      }));
    },
    [commit, currentUser],
  );

  const upsertPhotoAlbum: AppStore["upsertPhotoAlbum"] = useCallback(
    (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar Fotos." };
      }
      const title = input.title.trim();
      if (title.length < 2) return { ok: false, error: "Informe o título do álbum." };
      const stamp = nowIso();
      let saved!: PhotoAlbum;
      commit((prev) => {
        const list = prev.photoAlbums ?? [];
        if (input.id) {
          const cur = list.find((p) => p.id === input.id);
          if (!cur) return prev;
          saved = { ...cur, ...input, id: cur.id, title, updated_at: stamp };
          return {
            ...prev,
            photoAlbums: list.map((p) => (p.id === cur.id ? saved : p)),
          };
        }
        saved = {
          id: uid("alb"),
          title,
          description: input.description?.trim() || undefined,
          cover_url: input.cover_url,
          drive_url: input.drive_url?.trim() || undefined,
          photos: input.photos ?? [],
          published: input.published,
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, photoAlbums: [saved, ...list] };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const removePhotoAlbum: AppStore["removePhotoAlbum"] = useCallback(
    (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      commit((prev) => ({
        ...prev,
        photoAlbums: (prev.photoAlbums ?? []).filter((p) => p.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const value: AppStore = {
    ready,
    state,
    currentUser,
    loginDemo,
    updateProfile,
    login,
    logout,
    resetDemo,
    upsertMember,
    generateFee,
    confirmFeePayment,
    upsertExpense,
    upsertClient,
    saveClientRegistration,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    startAppointment,
    finishAppointment,
    addPublishedSlot,
    removePublishedSlot,
    sendMessage,
    addInternalNote,
    markNotificationRead,
    addNotification,
    savePaymentRecord,
    upsertStockProduct,
    stockEntry,
    stockExit,
    upsertLibraryItem,
    removeLibraryItem,
    upsertBlogPost,
    removeBlogPost,
    upsertEducationItem,
    removeEducationItem,
    upsertHierarchyPerson,
    removeHierarchyPerson,
    upsertChecklistItem,
    removeChecklistItem,
    toggleChecklistProgress,
    upsertAjodunEvent,
    removeAjodunEvent,
    toggleAjodunTask,
    upsertPhotoAlbum,
    removePhotoAlbum,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore deve ser usado dentro de AppStoreProvider");
  return ctx;
}
