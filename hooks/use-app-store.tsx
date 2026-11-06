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
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ensureClienteLinked,
  fetchProfileRow,
  mapProfileRow,
  mergeAuthProfile,
} from "@/lib/supabase/profile";
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
  ShopProduct,
  StockLot,
  StockMovement,
  StockProduct,
  UserRole,
} from "@/types";
import { canAccess, canManageHouseContent, canManageLibrary } from "@/lib/permissions";
import { formatAudioDuration } from "@/lib/chat";
import {
  deleteLibraryItemRemote,
  fetchLibraryItems,
  isUuid,
  upsertLibraryItemRemote,
  uploadLibraryFile,
} from "@/lib/supabase/library";
import {
  fetchChatMessages,
  fetchClientsRemote,
  insertMessageRemote,
  updateClientRegistrationRemote,
  uploadChatMedia,
  ensureClientsFromMessages,
} from "@/lib/supabase/chat";
import {
  deleteBlogPostRemote,
  deleteEducationRemote,
  deleteShopRemote,
  fetchBlogPostsRemote,
  fetchEducationRemote,
  fetchShopRemote,
  mergeById,
  upsertBlogPostRemote,
  upsertEducationRemote,
  upsertShopRemote,
} from "@/lib/supabase/house-content";
import {
  hideStaffChatInMap,
  normalizeStaffHidden,
  revealHiddenChatsWithNewerMessages,
  unhideStaffChatInMap,
} from "@/lib/staff-chat-visibility";
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
  /** Após signIn no browser: grava o perfil antes de ir pra área logada. */
  hydrateAuthProfile: (profile: Profile) => void;
  logout: () => void;
  resetDemo: () => void;
  updateProfile: (input: {
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string | null;
  }) => { ok: true; profile: Profile } | { ok: false; error: string };
  updateHouseSettings: (input: {
    pix_key?: string;
    pix_holder_name?: string;
  }) => { ok: true } | { ok: false; error: string };
  requestShopPurchase: (productId: string) =>
    | { ok: true }
    | { ok: false; error: string };
  releaseShopPurchase: (purchaseId: string) =>
    | { ok: true }
    | { ok: false; error: string };
  rejectShopPurchase: (purchaseId: string) =>
    | { ok: true }
    | { ok: false; error: string };
  upsertMember: (member: Omit<Member, "id" | "created_at" | "updated_at"> & { id?: string }) => Member;
  generateFee: (memberId: string, competence: string) => MonthlyFee | null;
  confirmFeePayment: (
    feeId: string,
    input: { method: PaymentMethod; amount: number; observation?: string },
  ) => MonthlyFee | null;
  upsertExpense: (expense: Omit<Expense, "id" | "created_at" | "updated_at"> & { id?: string }) => Expense;
  upsertClient: (client: Omit<Client, "id" | "created_at" | "updated_at"> & { id?: string }) => Client;
  removeClient: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
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
  patchAppointment: (id: string, patch: Partial<Appointment>) => Appointment | null;
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
    kind?: "text" | "audio" | "video" | "call";
    audio_data_url?: string;
    audio_duration_sec?: number;
    video_data_url?: string;
    call_url?: string;
  }) => Message | null;
  /** Oculta conversa só na visão da casa; cliente mantém o histórico. */
  hideStaffChat: (clientId: string) => void;
  unhideStaffChat: (clientId: string) => void;
  /** Desarquiva conversas ocultas se houver mensagem mais nova que a exclusão. */
  syncStaffChatVisibility: () => void;
  /** Recarrega mensagens/clientes da nuvem (Conversas). */
  refreshCloudChat: () => Promise<void>;
  addInternalNote: (client_id: string, body: string) => InternalNote | null;
  markNotificationRead: (id: string) => void;
  /** Ao abrir a conversa: limpa badge/lista de notificações de chat daquele cliente. */
  markChatNotificationsRead: (clientId: string) => void;
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
  }) => Promise<{ ok: true; item: LibraryItem } | { ok: false; error: string }>;
  removeLibraryItem: (id: string) => Promise<void>;
  upsertBlogPost: (
    input: Omit<BlogPost, "id" | "created_at" | "updated_at" | "author_name"> & {
      id?: string;
      author_name?: string;
    },
  ) => Promise<{ ok: true; item: BlogPost } | { ok: false; error: string }>;
  removeBlogPost: (id: string) => Promise<void>;
  upsertEducationItem: (
    input: Omit<EducationItem, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => Promise<{ ok: true; item: EducationItem } | { ok: false; error: string }>;
  removeEducationItem: (id: string) => Promise<void>;
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
  upsertShopProduct: (
    input: Omit<ShopProduct, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => Promise<{ ok: true; item: ShopProduct } | { ok: false; error: string }>;
  removeShopProduct: (id: string) => Promise<void>;
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
  const authMode = isSupabaseConfigured();
  // Providers só monta no cliente → podemos ler storage já no 1º render
  const [state, setState] = useState<AppState>(() =>
    toAppState(loadSharedData(), loadSessionUserId() ?? initialUserId),
  );
  // Com Supabase: não liberar o shell até a 1ª leitura da sessão
  // (senão o AppShell manda pra / porque o perfil Auth ainda não chegou).
  const [ready, setReady] = useState(!authMode);

  useEffect(() => {
    // Re-sincroniza (outra aba pode ter gravado dados)
    try {
      const data = loadSharedData();
      const userId = loadSessionUserId();
      setState(toAppState(data, userId));
    } catch {
      // ignore
    }
    if (!isSupabaseConfigured()) setReady(true);
  }, []);

  // Sessão Auth Supabase → injeta perfil real e currentUserId
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createBrowserClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;
    let firstDone = false;

    function markReady() {
      if (!firstDone) {
        firstDone = true;
        setReady(true);
      }
    }

    async function applyUser(
      userId: string | null,
      opts: { allowClear?: boolean } = {},
    ) {
      if (cancelled) return;
      if (!userId) {
        // Não limpar em eventos espúrios do Auth (ex.: INITIAL_SESSION null)
        if (!opts.allowClear) {
          markReady();
          return;
        }
        setState((prev) => {
          const next = { ...prev, currentUserId: null };
          persistSessionUserId(null);
          return next;
        });
        markReady();
        return;
      }
      let row = await fetchProfileRow(supabase!, userId);
      if (cancelled) return;
      if (!row) {
        if (!opts.allowClear) {
          markReady();
          return;
        }
        setState((prev) => {
          const next = { ...prev, currentUserId: null };
          persistSessionUserId(null);
          return next;
        });
        markReady();
        return;
      }

      // Conta Auth de cliente sem ficha → cria clients + client_id
      if (row.role === "cliente" && !row.client_id) {
        row = await ensureClienteLinked(supabase!, row);
      }

      const authProfile = mapProfileRow(row);
      setState((prev) => {
        const profiles = mergeAuthProfile(prev.profiles, authProfile);
        let clients = prev.clients;
        let messages = prev.messages;
        if (authProfile.role === "cliente" && authProfile.client_id) {
          const exists = clients.some((c) => c.id === authProfile.client_id);
          if (!exists) {
            const stamp = new Date().toISOString();
            const stub: Client = {
              id: authProfile.client_id,
              full_name: authProfile.full_name || authProfile.email,
              phone: "a definir",
              email: authProfile.email,
              registration_complete: false,
              created_at: stamp,
              updated_at: stamp,
            };
            clients = [stub, ...clients];
          }
          // Conversa já nasce com o Pai de Santo
          const hasThread = messages.some((m) => m.client_id === authProfile.client_id);
          if (!hasThread) {
            const pai =
              profiles.find((p) => p.role === "pai_de_santo") ??
              prev.profiles.find((p) => p.role === "pai_de_santo");
            const stamp = new Date().toISOString();
            messages = [
              ...messages,
              {
                id: uid("msg"),
                client_id: authProfile.client_id,
                sender_id: pai?.id,
                sender_role: "pai_de_santo",
                sender_name: pai?.full_name || "Pai de Santo",
                body: "Olá! Este é o seu chat direto com o Pai de Santo. Pode escrever, enviar áudio ou vídeo — e iniciar chamada quando precisar.",
                kind: "text",
                created_at: stamp,
              },
            ];
          }
        }
        const next = {
          ...prev,
          profiles,
          clients,
          messages,
          currentUserId: authProfile.id,
        };
        persistSharedData(stripSession(next));
        persistSessionUserId(authProfile.id);
        return next;
      });
      markReady();
    }

    // getSession é mais estável no celular que getUser no 1º paint
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) void applyUser(data.session.user.id);
      else markReady();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      if (event === "SIGNED_OUT") {
        // Em alguns dispositivos o SIGNED_OUT dispara sem sessão real acabar
        void supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user?.id) {
            void applyUser(data.session.user.id);
            return;
          }
          void applyUser(null, { allowClear: true });
        });
        return;
      }
      if (session?.user?.id) void applyUser(session.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
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

  const refreshCloudChat = useCallback(async () => {
    if (!authMode) return;
    const supabase = createBrowserClient();
    if (!supabase) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.warn("[sync] sem sessão Auth — RLS bloquearia a leitura");
      return;
    }

    const [libRes, msgRes, clientsRes, blogRes, eduRes, shopRes] = await Promise.all([
      fetchLibraryItems(supabase),
      fetchChatMessages(supabase),
      fetchClientsRemote(supabase),
      fetchBlogPostsRemote(supabase),
      fetchEducationRemote(supabase),
      fetchShopRemote(supabase),
    ]);

    setState((prev) => {
      let next = { ...prev };
      if (libRes.ok) {
        next = {
          ...next,
          libraryItems: mergeById(libRes.items, prev.libraryItems ?? []),
        };
      } else {
        console.warn("[biblioteca] sync:", libRes.error);
      }
      if (blogRes.ok) {
        next = {
          ...next,
          blogPosts: mergeById(blogRes.items, prev.blogPosts ?? []),
        };
      } else {
        console.warn("[blog] sync:", blogRes.error);
      }
      if (eduRes.ok) {
        next = {
          ...next,
          educationItems: mergeById(eduRes.items, prev.educationItems ?? []),
        };
      } else {
        console.warn("[educacao] sync:", eduRes.error);
      }
      if (shopRes.ok) {
        next = {
          ...next,
          shopProducts: mergeById(shopRes.items, prev.shopProducts ?? []),
        };
      } else {
        console.warn("[loja] sync:", shopRes.error);
      }
      if (msgRes.ok) {
        const byId = new Map<string, Message>();
        for (const m of msgRes.items) byId.set(m.id, m);
        // Mantém mensagens locais ainda não refletidas na nuvem (UUID otimista
        // ou ids demo) — senão o sync reocultava a conversa logo após enviar.
        for (const m of prev.messages ?? []) {
          if (!byId.has(m.id)) byId.set(m.id, m);
        }
        const mergedMessages = Array.from(byId.values()).sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        );
        // Mensagem depois de “excluir da lista” → conversa volta (como WhatsApp)
        const hiddenMap = revealHiddenChatsWithNewerMessages(
          normalizeStaffHidden(prev.staffHiddenClientIds, prev.staffHiddenAt),
          mergedMessages,
        );
        next = {
          ...next,
          messages: mergedMessages,
          staffHiddenAt: hiddenMap,
          staffHiddenClientIds: Object.keys(hiddenMap),
        };
      } else {
        console.warn("[chat] sync:", msgRes.error);
      }
      if (clientsRes.ok) {
        const remoteIds = new Set(clientsRes.items.map((c) => c.id));
        const localOnly = (prev.clients ?? []).filter((c) => !isUuid(c.id));
        const merged = [
          ...clientsRes.items,
          ...localOnly.filter((c) => !remoteIds.has(c.id)),
          ...(prev.clients ?? []).filter((c) => isUuid(c.id) && !remoteIds.has(c.id)),
        ];
        const dedup = Array.from(new Map(merged.map((c) => [c.id, c])).values());
        next = { ...next, clients: dedup };
      } else {
        console.warn("[clients] sync:", clientsRes.error);
      }
      next = {
        ...next,
        clients: ensureClientsFromMessages(next.clients ?? [], next.messages ?? []),
      };
      persistSharedData(stripSession(next));
      return next;
    });
  }, [authMode]);

  // Biblioteca + chat + clientes na nuvem (Supabase)
  useEffect(() => {
    if (!ready || !authMode || !state.currentUserId) return;
    const supabase = createBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    async function pullCloud() {
      if (cancelled) return;
      await refreshCloudChat();
    }

    void pullCloud();

    function onVisible() {
      if (document.visibilityState === "visible") void pullCloud();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    const channel = supabase
      .channel("cloud_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "library_items" },
        () => {
          void pullCloud();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void pullCloud();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          void pullCloud();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_posts" },
        () => {
          void pullCloud();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "education_items" },
        () => {
          void pullCloud();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_products" },
        () => {
          void pullCloud();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [ready, authMode, state.currentUserId, refreshCloudChat]);

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

  const hydrateAuthProfile = useCallback((profile: Profile) => {
    setState((prev) => {
      const profiles = mergeAuthProfile(prev.profiles, profile);
      let clients = prev.clients;
      let messages = prev.messages;
      if (profile.role === "cliente" && profile.client_id) {
        if (!clients.some((c) => c.id === profile.client_id)) {
          const stamp = new Date().toISOString();
          clients = [
            {
              id: profile.client_id,
              full_name: profile.full_name || profile.email,
              phone: "a definir",
              email: profile.email,
              registration_complete: false,
              created_at: stamp,
              updated_at: stamp,
            },
            ...clients,
          ];
        }
        if (!messages.some((m) => m.client_id === profile.client_id)) {
          const pai = profiles.find((p) => p.role === "pai_de_santo");
          const stamp = new Date().toISOString();
          messages = [
            ...messages,
            {
              id: uid("msg"),
              client_id: profile.client_id,
              sender_id: pai?.id,
              sender_role: "pai_de_santo",
              sender_name: pai?.full_name || "Pai de Santo",
              body: "Olá! Este é o seu chat direto com o Pai de Santo. Pode escrever, enviar áudio ou vídeo — e iniciar chamada quando precisar.",
              kind: "text",
              created_at: stamp,
            },
          ];
        }
      }
      const next = {
        ...prev,
        profiles,
        clients,
        messages,
        currentUserId: profile.id,
      };
      persistSharedData(stripSession(next));
      persistSessionUserId(profile.id);
      return next;
    });
    setReady(true);
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      if (isSupabaseConfigured()) {
        return {
          ok: false,
          error: "Use o formulário de entrada — Auth Supabase ativo.",
        };
      }
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
    if (isSupabaseConfigured()) {
      const supabase = createBrowserClient();
      void supabase?.auth.signOut();
    }
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
        // Atualiza nome nas mensagens já enviadas (chat deixa de mostrar rótulo antigo)
        const messages = (prev.messages ?? []).map((m) =>
          m.sender_id === currentUser.id
            ? { ...m, sender_name: full_name }
            : m,
        );
        return {
          ...prev,
          messages,
          profiles: prev.profiles.map((p) => (p.id === currentUser.id ? saved! : p)),
        };
      });
      if (conflict) return { ok: false, error: "Este e-mail já está em uso." };
      const profileSaved = saved as Profile | null;
      if (!profileSaved) return { ok: false, error: "Não foi possível salvar." };

      if (isSupabaseConfigured()) {
        const supabase = createBrowserClient();
        void supabase
          ?.from("profiles")
          .update({
            full_name: profileSaved.full_name,
            email: profileSaved.email,
            phone: profileSaved.phone ?? null,
            avatar_url: profileSaved.avatar_url ?? null,
            updated_at: profileSaved.updated_at,
          })
          .eq("id", currentUser.id);
      }

      return { ok: true, profile: profileSaved };
    },
    [commit, currentUser],
  );

  const updateHouseSettings: AppStore["updateHouseSettings"] = useCallback(
    (input) => {
      if (
        !currentUser ||
        (currentUser.role !== "pai_de_santo" && currentUser.role !== "administrador")
      ) {
        return { ok: false, error: "Só o Pai ou Admin altera o Pix da casa." };
      }
      const stamp = nowIso();
      commit((prev) => ({
        ...prev,
        houseSettings: {
          ...(prev.houseSettings ?? {}),
          pix_key: input.pix_key?.trim() ?? prev.houseSettings?.pix_key,
          pix_holder_name:
            input.pix_holder_name?.trim() ?? prev.houseSettings?.pix_holder_name,
          updated_at: stamp,
        },
      }));
      if (isSupabaseConfigured()) {
        const supabase = createBrowserClient();
        void supabase?.from("house_settings").upsert({
          id: "casa",
          pix_key: input.pix_key?.trim() || null,
          pix_holder_name: input.pix_holder_name?.trim() || null,
          updated_at: stamp,
        });
      }
      return { ok: true };
    },
    [commit, currentUser],
  );

  const requestShopPurchase: AppStore["requestShopPurchase"] = useCallback(
    (productId) => {
      if (!currentUser || currentUser.role !== "cliente" || !currentUser.client_id) {
        return { ok: false, error: "Entre no App do Cliente para comprar." };
      }
      const product = (state.shopProducts ?? []).find((p) => p.id === productId);
      if (!product || !product.available) {
        return { ok: false, error: "Produto indisponível." };
      }
      const clientId = currentUser.client_id;
      const existing = (state.shopPurchases ?? []).find(
        (p) =>
          p.product_id === productId &&
          p.client_id === clientId &&
          (p.status === "solicitado" || p.status === "pago_liberado"),
      );
      if (existing?.status === "pago_liberado") {
        return { ok: false, error: "Você já tem este conteúdo liberado." };
      }
      if (existing?.status === "solicitado") {
        return { ok: false, error: "Compra já solicitada — aguarde o Financeiro." };
      }
      const stamp = nowIso();
      const purchase = {
        id: isSupabaseConfigured() ? crypto.randomUUID() : uid("buy"),
        product_id: productId,
        client_id: clientId,
        status: "solicitado" as const,
        created_at: stamp,
        updated_at: stamp,
      };
      const staffNote = {
        id: uid("ntf"),
        title: "Nova compra na loja",
        body: `${currentUser.full_name} pediu: ${product.name} (R$ ${product.price.toFixed(2)}).`,
        type: "financeiro" as const,
        audience: ["tesouraria", "pai_de_santo", "administrador"] as UserRole[],
        related_id: purchase.id,
        read: false,
        href: "/loja/liberacoes",
        created_at: stamp,
      };
      commit((prev) => ({
        ...prev,
        shopPurchases: [purchase, ...(prev.shopPurchases ?? [])],
        notifications: [staffNote, ...prev.notifications],
      }));
      if (isSupabaseConfigured() && isUuid(productId) && isUuid(clientId)) {
        const supabase = createBrowserClient();
        void supabase?.from("shop_purchases").insert({
          id: purchase.id,
          product_id: productId,
          client_id: clientId,
          status: "solicitado",
          created_at: stamp,
          updated_at: stamp,
        });
      }
      return { ok: true };
    },
    [commit, currentUser, state.shopProducts, state.shopPurchases],
  );

  const releaseShopPurchase: AppStore["releaseShopPurchase"] = useCallback(
    (purchaseId) => {
      if (
        !currentUser ||
        (currentUser.role !== "tesouraria" &&
          currentUser.role !== "administrador" &&
          currentUser.role !== "pai_de_santo")
      ) {
        return { ok: false, error: "Só o Financeiro (ou Admin) libera compras." };
      }
      // Preferência do plano: Financeiro libera; Pai/Admin também podem em emergência
      if (currentUser.role === "pai_de_santo") {
        // Pai vê, mas liberação oficial é tesouraria — ainda permite Admin/tesouraria;
        // pai_de_santo bloqueado de liberar
        return {
          ok: false,
          error: "Peça ao Financeiro para liberar após confirmar o pagamento.",
        };
      }
      let ok = false;
      commit((prev) => {
        const purchase = (prev.shopPurchases ?? []).find((p) => p.id === purchaseId);
        if (!purchase || purchase.status !== "solicitado") return prev;
        ok = true;
        const stamp = nowIso();
        const product = (prev.shopProducts ?? []).find((p) => p.id === purchase.product_id);
        const clientNote = {
          id: uid("ntf"),
          title: "Conteúdo liberado",
          body: `${product?.name ?? "Produto"} está disponível na loja.`,
          type: "financeiro" as const,
          audience: ["cliente"] as UserRole[],
          related_id: purchase.client_id,
          read: false,
          href: "/cliente/loja",
          created_at: stamp,
        };
        return {
          ...prev,
          shopPurchases: (prev.shopPurchases ?? []).map((p) =>
            p.id === purchaseId
              ? {
                  ...p,
                  status: "pago_liberado" as const,
                  released_by: currentUser.id,
                  updated_at: stamp,
                }
              : p,
          ),
          notifications: [clientNote, ...prev.notifications],
        };
      });
      if (!ok) return { ok: false, error: "Pedido não encontrado ou já tratado." };
      if (isSupabaseConfigured() && isUuid(purchaseId)) {
        const supabase = createBrowserClient();
        void supabase
          ?.from("shop_purchases")
          .update({
            status: "pago_liberado",
            released_by: currentUser.id,
            updated_at: nowIso(),
          })
          .eq("id", purchaseId);
      }
      return { ok: true };
    },
    [commit, currentUser],
  );

  const rejectShopPurchase: AppStore["rejectShopPurchase"] = useCallback(
    (purchaseId) => {
      if (
        !currentUser ||
        (currentUser.role !== "tesouraria" && currentUser.role !== "administrador")
      ) {
        return { ok: false, error: "Só o Financeiro pode recusar." };
      }
      let ok = false;
      commit((prev) => {
        const purchase = (prev.shopPurchases ?? []).find((p) => p.id === purchaseId);
        if (!purchase || purchase.status !== "solicitado") return prev;
        ok = true;
        const stamp = nowIso();
        const product = (prev.shopProducts ?? []).find((p) => p.id === purchase.product_id);
        const clientNote = {
          id: uid("ntf"),
          title: "Compra não liberada",
          body: `${product?.name ?? "Produto"}: fale com a casa pelo chat.`,
          type: "financeiro" as const,
          audience: ["cliente"] as UserRole[],
          related_id: purchase.client_id,
          read: false,
          href: "/cliente/mensagens",
          created_at: stamp,
        };
        return {
          ...prev,
          shopPurchases: (prev.shopPurchases ?? []).map((p) =>
            p.id === purchaseId
              ? { ...p, status: "recusado" as const, updated_at: stamp }
              : p,
          ),
          notifications: [clientNote, ...prev.notifications],
        };
      });
      if (!ok) return { ok: false, error: "Pedido não encontrado." };
      if (isSupabaseConfigured() && isUuid(purchaseId)) {
        const supabase = createBrowserClient();
        void supabase
          ?.from("shop_purchases")
          .update({ status: "recusado", updated_at: nowIso() })
          .eq("id", purchaseId);
      }
      return { ok: true };
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

  const removeClient: AppStore["removeClient"] = useCallback(
    async (id) => {
      if (
        !currentUser ||
        (currentUser.role !== "pai_de_santo" && currentUser.role !== "administrador")
      ) {
        return { ok: false, error: "Sem permissão para excluir cliente." };
      }

      if (isSupabaseConfigured() && isUuid(id)) {
        const supabase = createBrowserClient();
        if (!supabase) {
          return { ok: false, error: "Supabase não configurado." };
        }
        const { error } = await supabase.from("clients").delete().eq("id", id);
        if (error) {
          return {
            ok: false,
            error:
              error.message.includes("row-level security") || error.message.includes("RLS")
                ? "Sem permissão no banco para excluir este cliente."
                : error.message,
          };
        }
      }

      commit((prev) => ({
        ...prev,
        clients: prev.clients.filter((c) => c.id !== id),
        messages: prev.messages.filter((m) => m.client_id !== id),
        appointments: prev.appointments.filter((a) => a.client_id !== id),
        internalNotes: prev.internalNotes.filter((n) => n.client_id !== id),
        staffHiddenClientIds: (prev.staffHiddenClientIds ?? []).filter((x) => x !== id),
        staffHiddenAt: (() => {
          const map = { ...(prev.staffHiddenAt ?? {}) };
          delete map[id];
          return map;
        })(),
        profiles: prev.profiles.map((p) =>
          p.client_id === id ? { ...p, client_id: undefined } : p,
        ),
      }));
      return { ok: true };
    },
    [commit, currentUser],
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
      const clientId = currentUser.client_id!;
      commit((prev) => {
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

      if (isSupabaseConfigured() && isUuid(clientId)) {
        const supabase = createBrowserClient();
        if (supabase) {
          void updateClientRegistrationRemote(supabase, {
            client_id: clientId,
            full_name,
            phone,
            email: email || undefined,
            birth_date,
          }).then((res) => {
            if (!res.ok) console.warn("[cadastro] sync:", res.error);
          });
        }
      }

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
          title: "Novo jogo na agenda",
          body: `${client?.full_name ?? "Cliente"} solicitou atendimento em ${new Date(input.scheduled_at).toLocaleString("pt-BR")}.`,
          type: "agenda",
          audience: ["pai_de_santo", "administrador"],
          related_id: input.client_id,
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
        const stamp = nowIso();
        updated = { ...current, status, updated_at: stamp };
        const client = prev.clients.find((c) => c.id === current.client_id);
        const statusLabel: Record<string, string> = {
          CONFIRMADO: "confirmou seu jogo",
          CANCELADO: "cancelou seu jogo",
          EM_ATENDIMENTO: "iniciou seu atendimento",
          REALIZADO: "concluiu seu atendimento",
          NAO_COMPARECEU: "registrou falta no horário",
          SOLICITADO: "atualizou seu pedido",
        };
        const label = statusLabel[status] ?? "atualizou seu agendamento";
        const clientNote: AppNotification = {
          id: uid("ntf"),
          title: "Atualização na agenda",
          body: `A casa ${label} (${new Date(current.scheduled_at).toLocaleString("pt-BR")}).`,
          type: "agenda",
          audience: ["cliente"],
          related_id: current.client_id,
          read: false,
          href: "/cliente/horarios",
          created_at: stamp,
        };
        const staffExtra: AppNotification | null =
          status === "CONFIRMADO"
            ? {
                id: uid("ntf"),
                title: "Jogo confirmado",
                body: `${client?.full_name ?? "Cliente"} — ${new Date(current.scheduled_at).toLocaleString("pt-BR")}`,
                type: "agenda",
                audience: ["pai_de_santo", "administrador"],
                related_id: current.client_id,
                read: false,
                href: "/agenda",
                created_at: stamp,
              }
            : null;
        return {
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? updated! : a)),
          notifications: [
            clientNote,
            ...(staffExtra ? [staffExtra] : []),
            ...prev.notifications,
          ],
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
          related_id: current.client_id,
          read: false,
          href: "/cliente/horarios",
          created_at: stamp,
        };
        const clientCancel: AppNotification = {
          id: uid("ntf"),
          title: "Jogo cancelado",
          body: `Seu atendimento em ${new Date(current.scheduled_at).toLocaleString("pt-BR")} foi cancelado.`,
          type: "agenda",
          audience: ["cliente"],
          related_id: current.client_id,
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
          notifications: [clientCancel, broadcast, staffNote, ...prev.notifications],
        };
      });
      return updated;
    },
    [commit],
  );

  const patchAppointment: AppStore["patchAppointment"] = useCallback(
    (id, patch) => {
      let updated: Appointment | null = null;
      commit((prev) => {
        const current = prev.appointments.find((a) => a.id === id);
        if (!current) return prev;
        updated = { ...current, ...patch, updated_at: nowIso() };
        return {
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? updated! : a)),
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
      const kind =
        input.kind ??
        (input.video_data_url
          ? "video"
          : input.audio_data_url
            ? "audio"
            : input.call_url
              ? "call"
              : "text");
      if (kind === "audio" && !input.audio_data_url) return null;
      if (kind === "video" && !input.video_data_url) return null;
      if (kind === "call" && !input.call_url) return null;
      if (kind === "text" && !input.body?.trim()) return null;

      const stamp = nowIso();
      const durationSec = input.audio_duration_sec;
      const audioLabel =
        typeof durationSec === "number"
          ? `Áudio · ${formatAudioDuration(durationSec)}`
          : "Áudio";
      const body =
        kind === "audio"
          ? audioLabel
          : kind === "video"
            ? "Vídeo"
            : kind === "call"
              ? input.body?.trim() || "Chamada de vídeo"
              : input.body!.trim();

      const cloud = isSupabaseConfigured() && isUuid(input.client_id);
      const message: Message = {
        id: cloud ? crypto.randomUUID() : uid("msg"),
        client_id: input.client_id,
        sender_id: currentUser.id,
        sender_role: currentUser.role,
        sender_name: currentUser.full_name,
        body,
        kind,
        audio_data_url: kind === "audio" ? input.audio_data_url : undefined,
        audio_duration_sec: kind === "audio" ? durationSec : undefined,
        video_data_url: kind === "video" ? input.video_data_url : undefined,
        call_url: kind === "call" ? input.call_url : undefined,
        appointment_id: input.appointment_id,
        created_at: stamp,
      };

      const clientName =
        currentUser.role === "cliente" ? currentUser.full_name : undefined;

      commit((prev) => {
        const client = prev.clients.find((c) => c.id === input.client_id);
        const fromClient = currentUser.role === "cliente";
        const preview =
          kind === "audio"
            ? audioLabel
            : kind === "video"
              ? "Vídeo"
              : kind === "call"
                ? "Chamada de vídeo"
                : body;
        const notification: AppNotification = {
          id: uid("ntf"),
          title: fromClient ? "Nova mensagem do cliente" : "Nova mensagem da casa",
          body: fromClient
            ? `${clientName ?? client?.full_name ?? "Cliente"}: ${preview}`
            : `${currentUser.full_name}: ${preview}`,
          type: "chat",
          audience: fromClient
            ? ["pai_de_santo", "administrador"]
            : ["cliente"],
          related_id: input.client_id,
          read: false,
          href: fromClient ? `/conversas/${input.client_id}` : `/cliente/mensagens`,
          created_at: stamp,
        };
        const hiddenMap = normalizeStaffHidden(
          prev.staffHiddenClientIds,
          prev.staffHiddenAt,
        );
        // Qualquer mensagem nova na thread desarquiva na visão da casa
        const nextHidden = unhideStaffChatInMap(hiddenMap, input.client_id);
        return {
          ...prev,
          messages: [...prev.messages, message],
          notifications: [notification, ...prev.notifications],
          staffHiddenAt: nextHidden,
          staffHiddenClientIds: Object.keys(nextHidden),
        };
      });

      if (cloud) {
        const supabase = createBrowserClient();
        if (supabase) {
          void (async () => {
            let audio_url = message.audio_url;
            let video_url = message.video_url;
            let audio_data_url = message.audio_data_url;
            let video_data_url = message.video_data_url;

            if (kind === "audio" && input.audio_data_url) {
              const up = await uploadChatMedia(
                supabase,
                input.client_id,
                input.audio_data_url,
                "audio",
              );
              if (!up.ok) {
                console.warn("[chat] upload áudio:", up.error);
                return;
              }
              audio_url = up.url;
              audio_data_url = undefined;
            }
            if (kind === "video" && input.video_data_url) {
              const up = await uploadChatMedia(
                supabase,
                input.client_id,
                input.video_data_url,
                "video",
              );
              if (!up.ok) {
                console.warn("[chat] upload vídeo:", up.error);
                return;
              }
              video_url = up.url;
              video_data_url = undefined;
            }

            const remote = await insertMessageRemote(supabase, {
              ...message,
              audio_url,
              video_url,
              audio_data_url: undefined,
              video_data_url: undefined,
            });
            if (!remote.ok) {
              console.warn("[chat] envio nuvem:", remote.error);
              return;
            }
            commit((prev) => ({
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === message.id
                  ? {
                      ...remote.item,
                      audio_data_url: audio_data_url ?? remote.item.audio_data_url,
                      video_data_url: video_data_url ?? remote.item.video_data_url,
                    }
                  : m,
              ),
            }));

            // Web Push: cliente → Pai | Pai/casa → cliente
            if (currentUser.role === "cliente") {
              void fetch("/api/push/notify-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audience: "staff",
                  client_id: input.client_id,
                  preview: body,
                  sender_name: currentUser.full_name,
                }),
              }).catch(() => null);
            } else if (
              currentUser.role === "pai_de_santo" ||
              currentUser.role === "administrador"
            ) {
              void fetch("/api/push/notify-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audience: "cliente",
                  client_id: input.client_id,
                  preview: body,
                  sender_name: currentUser.full_name,
                }),
              }).catch(() => null);
            }
          })();
        }
      } else if (isSupabaseConfigured() && !isUuid(input.client_id)) {
        console.warn(
          "[chat] client_id local — mensagem não chega ao Pai. Rode 017 e entre de novo.",
        );
      }

      return message;
    },
    [commit, currentUser],
  );

  const hideStaffChat: AppStore["hideStaffChat"] = useCallback(
    (clientId) => {
      commit((prev) => {
        const map = normalizeStaffHidden(prev.staffHiddenClientIds, prev.staffHiddenAt);
        const next = hideStaffChatInMap(map, clientId, nowIso());
        return {
          ...prev,
          staffHiddenAt: next,
          staffHiddenClientIds: Object.keys(next),
        };
      });
    },
    [commit],
  );

  const unhideStaffChat: AppStore["unhideStaffChat"] = useCallback(
    (clientId) => {
      commit((prev) => {
        const map = normalizeStaffHidden(prev.staffHiddenClientIds, prev.staffHiddenAt);
        const next = unhideStaffChatInMap(map, clientId);
        return {
          ...prev,
          staffHiddenAt: next,
          staffHiddenClientIds: Object.keys(next),
        };
      });
    },
    [commit],
  );

  const syncStaffChatVisibility: AppStore["syncStaffChatVisibility"] = useCallback(() => {
    commit((prev) => {
      const map = normalizeStaffHidden(prev.staffHiddenClientIds, prev.staffHiddenAt);
      const next = revealHiddenChatsWithNewerMessages(map, prev.messages ?? []);
      if (next === map) return prev;
      return {
        ...prev,
        staffHiddenAt: next,
        staffHiddenClientIds: Object.keys(next),
      };
    });
  }, [commit]);

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

  const markChatNotificationsRead = useCallback(
    (clientId: string) => {
      if (!clientId) return;
      commit((prev) => {
        let changed = false;
        const notifications = prev.notifications.map((n) => {
          if (n.read || n.type !== "chat") return n;
          // Thread certa, ou chat antigo sem related_id (seed / legado)
          const match =
            n.related_id === clientId ||
            !n.related_id ||
            (typeof n.href === "string" && n.href.includes(clientId));
          if (!match) return n;
          changed = true;
          return { ...n, read: true };
        });
        return changed ? { ...prev, notifications } : prev;
      });
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
    async (input) => {
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
      if (!external && !hasFile && !input.id) {
        return {
          ok: false,
          error: "Envie um arquivo ou cole um link (YouTube, Drive, áudio online…).",
        };
      }

      const stamp = nowIso();
      const cloud = isSupabaseConfigured();
      const existing = input.id
        ? (state.libraryItems ?? []).find((i) => i.id === input.id)
        : undefined;
      if (input.id && !existing) {
        return { ok: false, error: "Material não encontrado." };
      }

      const id =
        existing?.id ??
        (cloud ? crypto.randomUUID() : uid("lib"));

      let file_url = existing?.file_url;
      let file_data_url =
        input.file_data_url === ""
          ? undefined
          : (input.file_data_url ?? existing?.file_data_url);
      let file_name =
        input.file_data_url === ""
          ? undefined
          : (input.file_name ?? existing?.file_name);
      let mime_type =
        input.file_data_url === ""
          ? undefined
          : (input.mime_type ?? existing?.mime_type);

      if (input.file_data_url === "") {
        file_url = undefined;
      }

      if (cloud && input.file_data_url) {
        const supabase = createBrowserClient();
        if (!supabase) {
          return { ok: false, error: "Supabase não configurado neste ambiente." };
        }
        const uploaded = await uploadLibraryFile(
          supabase,
          id,
          input.file_data_url,
          input.file_name,
        );
        if (!uploaded.ok) return uploaded;
        file_url = uploaded.file_url;
        file_data_url = undefined;
      }

      let saved: LibraryItem = {
        id,
        title,
        description: input.description?.trim() || undefined,
        kind: input.kind,
        external_url: external,
        file_url,
        file_data_url: cloud ? undefined : file_data_url,
        file_name,
        mime_type,
        visible_to_clients: input.visible_to_clients,
        uploaded_by: existing?.uploaded_by ?? currentUser.id,
        uploaded_by_name: existing?.uploaded_by_name ?? currentUser.full_name,
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp,
      };

      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) {
          return { ok: false, error: "Supabase não configurado neste ambiente." };
        }
        const remotePayload: LibraryItem = {
          ...saved,
          uploaded_by: isUuid(saved.uploaded_by ?? "") ? saved.uploaded_by : undefined,
          file_data_url: undefined,
        };
        const remote = await upsertLibraryItemRemote(supabase, remotePayload);
        if (!remote.ok) {
          return {
            ok: false,
            error:
              remote.error.includes("row-level security") || remote.error.includes("RLS")
                ? "Sem permissão no banco para publicar. Rode a migration 018_library_sync.sql e confirme o papel Biblioteca/Pai."
                : remote.error,
          };
        }
        saved = remote.item;
      }

      commit((prev) => {
        const items = prev.libraryItems ?? [];
        const notifications = [...prev.notifications];
        const isNew = !items.some((i) => i.id === saved.id);
        if (isNew && saved.visible_to_clients) {
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
          libraryItems: isNew
            ? [saved, ...items]
            : items.map((i) => (i.id === saved.id ? saved : i)),
          notifications,
        };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser, state.libraryItems],
  );

  const removeLibraryItem: AppStore["removeLibraryItem"] = useCallback(
    async (id) => {
      if (!currentUser || !canManageLibrary(currentUser.role)) return;
      if (isSupabaseConfigured()) {
        const supabase = createBrowserClient();
        if (supabase && isUuid(id)) {
          const remote = await deleteLibraryItemRemote(supabase, id);
          if (!remote.ok) {
            console.warn("Falha ao remover na nuvem:", remote.error);
            return;
          }
        }
      }
      commit((prev) => ({
        ...prev,
        libraryItems: (prev.libraryItems ?? []).filter((i) => i.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const upsertBlogPost: AppStore["upsertBlogPost"] = useCallback(
    async (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar Quem Somos." };
      }
      const title = input.title.trim();
      const body = input.body.trim();
      if (title.length < 2 || body.length < 2) {
        return { ok: false, error: "Título e texto são obrigatórios." };
      }
      const stamp = nowIso();
      const cloud = isSupabaseConfigured();
      const existing = input.id
        ? (state.blogPosts ?? []).find((p) => p.id === input.id)
        : undefined;
      if (input.id && !existing) return { ok: false, error: "Post não encontrado." };

      let saved: BlogPost = {
        id: existing?.id ?? (cloud ? crypto.randomUUID() : uid("blog")),
        title,
        body,
        excerpt: input.excerpt?.trim() || undefined,
        category: input.category,
        cover_url: input.cover_url,
        author_name:
          input.author_name?.trim() || existing?.author_name || currentUser.full_name,
        published: input.published,
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp,
      };

      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) return { ok: false, error: "Supabase não configurado." };
        const remote = await upsertBlogPostRemote(supabase, saved);
        if (!remote.ok) {
          return {
            ok: false,
            error:
              remote.error.includes("row-level security") || remote.error.includes("RLS")
                ? "Sem permissão no banco. Rode a migration 021_house_content_sync.sql no Supabase."
                : remote.error,
          };
        }
        saved = remote.item;
      }

      commit((prev) => {
        const list = prev.blogPosts ?? [];
        const exists = list.some((p) => p.id === saved.id);
        return {
          ...prev,
          blogPosts: exists
            ? list.map((p) => (p.id === saved.id ? saved : p))
            : [saved, ...list],
        };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser, state.blogPosts],
  );

  const removeBlogPost: AppStore["removeBlogPost"] = useCallback(
    async (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      if (isSupabaseConfigured() && isUuid(id)) {
        const supabase = createBrowserClient();
        if (supabase) {
          const remote = await deleteBlogPostRemote(supabase, id);
          if (!remote.ok) console.warn("[blog] delete:", remote.error);
        }
      }
      commit((prev) => ({
        ...prev,
        blogPosts: (prev.blogPosts ?? []).filter((p) => p.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const upsertEducationItem: AppStore["upsertEducationItem"] = useCallback(
    async (input) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) {
        return { ok: false, error: "Sem permissão para editar Educação." };
      }
      const title = input.title.trim();
      if (title.length < 2) return { ok: false, error: "Informe o título." };
      const stamp = nowIso();
      const cloud = isSupabaseConfigured();
      const existing = input.id
        ? (state.educationItems ?? []).find((p) => p.id === input.id)
        : undefined;
      if (input.id && !existing) return { ok: false, error: "Item não encontrado." };

      let saved: EducationItem = {
        id: existing?.id ?? (cloud ? crypto.randomUUID() : uid("edu")),
        title,
        description: input.description?.trim() || undefined,
        kind: input.kind,
        url: input.url?.trim() || undefined,
        author_or_source: input.author_or_source?.trim() || undefined,
        published: input.published,
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp,
      };

      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) return { ok: false, error: "Supabase não configurado." };
        const remote = await upsertEducationRemote(supabase, saved);
        if (!remote.ok) {
          return {
            ok: false,
            error:
              remote.error.includes("row-level security") || remote.error.includes("RLS")
                ? "Sem permissão no banco. Rode a migration 021_house_content_sync.sql no Supabase."
                : remote.error,
          };
        }
        saved = remote.item;
      }

      commit((prev) => {
        const list = prev.educationItems ?? [];
        const exists = list.some((p) => p.id === saved.id);
        return {
          ...prev,
          educationItems: exists
            ? list.map((p) => (p.id === saved.id ? saved : p))
            : [saved, ...list],
        };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser, state.educationItems],
  );

  const removeEducationItem: AppStore["removeEducationItem"] = useCallback(
    async (id) => {
      if (!currentUser || !canManageHouseContent(currentUser.role)) return;
      if (isSupabaseConfigured() && isUuid(id)) {
        const supabase = createBrowserClient();
        if (supabase) {
          const remote = await deleteEducationRemote(supabase, id);
          if (!remote.ok) console.warn("[educacao] delete:", remote.error);
        }
      }
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

  const upsertShopProduct: AppStore["upsertShopProduct"] = useCallback(
    async (input) => {
      if (!currentUser || !canAccess(currentUser.role, "shop")) {
        return { ok: false, error: "Sem permissão para editar a loja." };
      }
      const name = input.name.trim();
      if (name.length < 2) return { ok: false, error: "Informe o nome do produto." };
      if (input.price < 0 || Number.isNaN(input.price)) {
        return { ok: false, error: "Preço inválido." };
      }
      const stamp = nowIso();
      const cloud = isSupabaseConfigured();
      const existing = input.id
        ? (state.shopProducts ?? []).find((p) => p.id === input.id)
        : undefined;
      if (input.id && !existing) return { ok: false, error: "Produto não encontrado." };

      let saved: ShopProduct = {
        id: existing?.id ?? (cloud ? crypto.randomUUID() : uid("shop")),
        name,
        description: input.description?.trim() || undefined,
        price: input.price,
        image_url: input.image_url?.trim() || undefined,
        category: input.category?.trim() || undefined,
        available: input.available,
        sort_order: input.sort_order ?? (state.shopProducts?.length ?? 0) + 1,
        kind: input.kind ?? existing?.kind ?? "fisico",
        file_url: input.file_url?.trim() || existing?.file_url,
        requires_payment: input.requires_payment ?? existing?.requires_payment ?? false,
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp,
      };

      if (cloud) {
        const supabase = createBrowserClient();
        if (!supabase) return { ok: false, error: "Supabase não configurado." };
        const remote = await upsertShopRemote(supabase, saved);
        if (!remote.ok) {
          const err = remote.error.toLowerCase();
          const missingCol =
            err.includes("schema cache") ||
            err.includes("could not find") ||
            (err.includes("column") &&
              (err.includes("kind") ||
                err.includes("file_url") ||
                err.includes("requires_payment")));
          const rls =
            err.includes("row-level security") ||
            err.includes("rls") ||
            err.includes("permission denied");
          return {
            ok: false,
            error: missingCol
              ? "Faltam colunas da loja digital. No Supabase → SQL Editor, rode 023_shop_digital.sql (ou 024_shop_repair.sql)."
              : rls
                ? "Sem permissão no banco (RLS). Confirme role pai_de_santo/administrador no profiles e rode 021 + 024_shop_repair.sql."
                : remote.error,
          };
        }
        saved = remote.item;
      }

      commit((prev) => {
        const list = prev.shopProducts ?? [];
        const exists = list.some((p) => p.id === saved.id);
        return {
          ...prev,
          shopProducts: exists
            ? list.map((p) => (p.id === saved.id ? saved : p))
            : [saved, ...list],
        };
      });
      return { ok: true, item: saved };
    },
    [commit, currentUser, state.shopProducts],
  );

  const removeShopProduct: AppStore["removeShopProduct"] = useCallback(
    async (id) => {
      if (!currentUser || !canAccess(currentUser.role, "shop")) return;
      if (isSupabaseConfigured() && isUuid(id)) {
        const supabase = createBrowserClient();
        if (supabase) {
          const remote = await deleteShopRemote(supabase, id);
          if (!remote.ok) console.warn("[loja] delete:", remote.error);
        }
      }
      commit((prev) => ({
        ...prev,
        shopProducts: (prev.shopProducts ?? []).filter((p) => p.id !== id),
      }));
    },
    [commit, currentUser],
  );

  const value: AppStore = {
    ready,
    state,
    currentUser,
    loginDemo,
    hydrateAuthProfile,
    updateProfile,
    updateHouseSettings,
    requestShopPurchase,
    releaseShopPurchase,
    rejectShopPurchase,
    login,
    logout,
    resetDemo,
    upsertMember,
    generateFee,
    confirmFeePayment,
    upsertExpense,
    upsertClient,
    removeClient,
    saveClientRegistration,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    patchAppointment,
    startAppointment,
    finishAppointment,
    addPublishedSlot,
    removePublishedSlot,
    sendMessage,
    hideStaffChat,
    unhideStaffChat,
    syncStaffChatVisibility,
    refreshCloudChat,
    addInternalNote,
    markNotificationRead,
    markChatNotificationsRead,
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
    upsertShopProduct,
    removeShopProduct,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore deve ser usado dentro de AppStoreProvider");
  return ctx;
}
