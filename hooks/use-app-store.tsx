"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSeedState, DEMO_PASSWORD } from "@/lib/seed";
import { clearGuestChatSession } from "@/lib/guest-chat-session";
import {
  isDemoOverrideActive,
  readDemoOverrideId,
  writeDemoOverrideId,
} from "@/lib/demo-accounts";
import {
  DATA_KEY,
  loadPrivateData,
  loadSessionUserId,
  loadSharedData,
  persistPrivateData,
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
import {
  actingProfileForArea,
  paiCanOpenArea,
  readViewAsArea,
  writeViewAsArea,
} from "@/lib/view-as";
import { nowIso, uid } from "@/lib/utils";
import type {
  AppNotification,
  AppState,
  Appointment,
  AppointmentGuestFicha,
  AppointmentStatus,
  AjodunMembership,
  Client,
  Expense,
  AjodunEvent,
  BlogPost,
  ChecklistItem,
  EducationItem,
  FeeReceipt,
  FilhoDaCasaResposta,
  HierarchyPerson,
  InscricaoOficina,
  InscricaoOficinaStatus,
  InternalNote,
  JogoAccessIndexEntry,
  JogoFlowStatus,
  JogoModalidade,
  JogoPaymentProof,
  LibraryItem,
  LibraryKind,
  Member,
  Message,
  MonthlyFee,
  Oficina,
  OficinaModalidade,
  OficinaStatus,
  Payment,
  PaymentMethod,
  PhotoAlbum,
  Profile,
  PublishedSlot,
  ShopInvoiceForm,
  ShopProduct,
  StockLot,
  StockMovement,
  StockProduct,
  UserRole,
} from "@/types";
import { ensureFilhoMemberState } from "@/lib/ensure-filho-member";
import { formatCompetence } from "@/lib/format";
import {
  canDeleteOficina,
  countOccupied,
  findActiveInscricao,
  isValidEmail,
  isValidPhone,
  tomorrowIsoDate,
  vagasRestantes,
} from "@/lib/oficinas";
import {
  canAccess,
  canManageHouseContent,
  canManageLibrary,
  canManageOficinas as roleCanManageOficinas,
} from "@/lib/permissions";
import {
  accessTokenExpiresAt,
  analysisDeadlineAt,
  analysisReminderAt,
  createJogoAccessToken,
  DEFAULT_JOGO_AMOUNT,
  findJogoAccessByToken,
  holdExpiresAt,
  isJogoOccupyingStatus,
  pruneJogoSlotHolds,
  upsertJogoAccessIndex,
  upsertJogoSlotHold,
} from "@/lib/jogo";
import { isJogoRemoteEnabled } from "@/lib/jogo/persistence";
import {
  remoteCompleteJogoFicha,
  remoteDecidirJogo,
  remoteHoldJogo,
  remoteListJogoOcupacao,
  remoteResolveJogoAccess,
  remoteSyncOwnedJogos,
  remoteUploadJogoComprovante,
} from "@/lib/jogo/remote-client";
import { clearLocalPushFlags, notifyJogoPush } from "@/lib/push-client";
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
  /** Compra sem conta: ficha NF + envio do conteúdo por e-mail. */
  requestShopPurchaseGuest: (
    productId: string,
    invoice: import("@/types").ShopInvoiceForm,
  ) => { ok: true } | { ok: false; error: string };
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
  requestAjodunAccess: (ajodunEventId: string) =>
    | { ok: true; membership: AjodunMembership }
    | { ok: false; error: string };
  decideAjodunMembership: (
    membershipId: string,
    decision: "approved" | "rejected",
  ) => { ok: true } | { ok: false; error: string };
  upsertExpense: (expense: Omit<Expense, "id" | "created_at" | "updated_at"> & { id?: string }) => Expense;
  upsertClient: (client: Omit<Client, "id" | "created_at" | "updated_at"> & { id?: string }) => Promise<Client | null>;
  claimUnassignedClient: (clientId: string) => Promise<boolean>;
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
  /** Marcação pública sem conta — ficha só o Pai vê. */
  bookGuestAppointment: (input: {
    scheduled_at: string;
    ficha: AppointmentGuestFicha;
    amount?: number;
    modalidade?: JogoModalidade;
  }) =>
    | {
        ok: true;
        appointment: Appointment;
        ficha_code: string;
        client_id: string;
      }
    | { ok: false; error: string };
  /** Reserva temporária do horário (pending) no fluxo público de Jogo. */
  holdGuestJogo: (input: {
    scheduled_at: string;
    modalidade: JogoModalidade;
    amount?: number;
  }) => Promise<
    | {
        ok: true;
        appointment: Appointment;
        ficha_code: string;
        client_id: string;
        hold_expires_at: string;
        guest_secret?: string;
      }
    | { ok: false; error: string }
  >;
  /** Completa dados do visitante na reserva (e-mail obrigatório). */
  completeGuestJogoFicha: (input: {
    appointment_id: string;
    ficha: AppointmentGuestFicha;
    guest_secret?: string;
  }) => Promise<{ ok: true; appointment: Appointment } | { ok: false; error: string }>;
  /** Anexa comprovante privado e move para aguardando aprovação. */
  attachGuestJogoProof: (input: {
    appointment_id: string;
    proof?: Omit<JogoPaymentProof, "uploaded_at">;
    file?: File;
    guest_secret?: string;
  }) => Promise<{ ok: true; appointment: Appointment } | { ok: false; error: string }>;
  /** Decisão exclusiva do Pai de Santo. */
  paiDecideJogo: (input: {
    appointment_id: string;
    decision: "aprovar" | "recusar" | "novo_comprovante";
    note?: string;
  }) => Promise<
    | {
        ok: true;
        appointment: Appointment;
        access_token?: string;
        email_event?: Appointment["last_email_event"];
      }
    | { ok: false; error: string }
  >;
  /** Resolve token público (sem expor PII). */
  resolveJogoAccess: (token: string) => Promise<JogoAccessIndexEntry | null>;
  /** Marca prazo de análise atingido sem auto-decidir. */
  refreshJogoDeadlines: () => void;
  /** Sincroniza Jogos remotos do Pai (cache local sem data_url). */
  syncRemoteJogos: () => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Chat do visitante (sem login) na marcação do jogo. */
  ensureGuestChatClient: (input: {
    full_name: string;
    phone: string;
  }) => { ok: true; client_id: string } | { ok: false; error: string };
  sendGuestMessage: (input: {
    client_id: string;
    guest_name: string;
    body?: string;
    kind?: "text" | "audio" | "video" | "call";
    audio_data_url?: string;
    audio_duration_sec?: number;
    video_data_url?: string;
    call_url?: string;
  }) => Message | null;
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
    /** casa = Pai; financeiro = compras / tesouraria */
    channel?: "casa" | "financeiro";
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
  upsertOficina: (input: {
    id?: string;
    titulo: string;
    descricao_curta: string;
    sobre: string;
    conteudo: string[];
    imagem?: string | null;
    modalidade: OficinaModalidade;
    status: OficinaStatus;
    data?: string | null;
    hora_inicio?: string | null;
    hora_fim?: string | null;
    local?: string | null;
    link?: string | null;
    total_vagas: number;
    permitir_lista_espera: boolean;
    data_limite_inscricao?: string | null;
    valor?: number | null;
  }) => { ok: true; item: Oficina } | { ok: false; error: string };
  duplicateOficina: (id: string) =>
    | { ok: true; item: Oficina }
    | { ok: false; error: string };
  encerrarOficina: (id: string) => { ok: true } | { ok: false; error: string };
  removeOficina: (id: string) => { ok: true } | { ok: false; error: string };
  inscreverOficina: (input: {
    oficina_id: string;
    nome_completo: string;
    telefone: string;
    email: string;
    data_nascimento?: string;
    e_filho_da_casa: FilhoDaCasaResposta;
    ja_participou_antes: boolean;
    necessidade_especial_ou_acessibilidade?: string;
    observacoes?: string;
    aceite_termos: boolean;
    force_waitlist?: boolean;
  }) =>
    | { ok: true; inscricao: InscricaoOficina; waitlist: boolean }
    | { ok: false; error: string };
  cancelarInscricaoOficina: (inscricaoId: string) =>
    | { ok: true }
    | { ok: false; error: string };
  atualizarStatusInscricaoOficina: (
    inscricaoId: string,
    status: InscricaoOficinaStatus,
  ) => { ok: true } | { ok: false; error: string };
  adicionarInscricaoManualOficina: (input: {
    oficina_id: string;
    nome_completo: string;
    telefone: string;
    email: string;
    e_filho_da_casa?: FilhoDaCasaResposta;
    status?: InscricaoOficinaStatus;
  }) => { ok: true; inscricao: InscricaoOficina } | { ok: false; error: string };
  runOficinaReminders: () => void;
};

const AppStoreContext = createContext<AppStore | null>(null);

function toAppState(data: SharedData, currentUserId: string | null): AppState {
  return { ...data, currentUserId };
}

function scopePrivateState(state: AppState, user: Profile | null): AppState {
  const clientIds = new Set(
    user?.role === "pai_de_santo"
      ? state.clients
          .filter((client) => client.responsible_profile_id === user.id)
          .map((client) => client.id)
      : user?.role === "cliente" && user.client_id
        ? [user.client_id]
        : [],
  );
  const appointments = state.appointments.filter((item) => clientIds.has(item.client_id));
  const appointmentIds = new Set(appointments.map((item) => item.id));

  return {
    ...state,
    profiles: state.profiles.filter(
      (profile) => profile.role !== "cliente" || profile.id === user?.id ||
        (profile.client_id ? clientIds.has(profile.client_id) : false),
    ),
    clients: state.clients.filter(
      (client) =>
        clientIds.has(client.id) ||
        (user?.role === "pai_de_santo" && !client.responsible_profile_id),
    ),
    appointments,
    messages: state.messages.filter((message) => clientIds.has(message.client_id)),
    internalNotes: user?.role === "pai_de_santo"
      ? state.internalNotes.filter((note) => clientIds.has(note.client_id))
      : [],
    notifications: state.notifications.filter((notification) => {
        const privateType = ["chat", "agenda", "atendimento"].includes(notification.type);
      if (user?.role === "pai_de_santo") {
        return !privateType || Boolean(
          notification.related_id &&
            (clientIds.has(notification.related_id) || appointmentIds.has(notification.related_id)),
        );
      }
      if (user?.role === "cliente") {
        return notification.user_id === user.id ||
          notification.related_id === user.client_id;
      }
        if (user?.role === "tesouraria") {
          return !privateType && Boolean(notification.audience?.includes("tesouraria"));
        }
        return !privateType && notification.type !== "financeiro";
    }),
    shopPurchases: user?.role === "pai_de_santo" || user?.role === "tesouraria"
      ? state.shopPurchases.filter((purchase) => !purchase.client_id || clientIds.has(purchase.client_id) || user.role === "tesouraria")
      : user?.role === "cliente"
        ? state.shopPurchases.filter((purchase) => purchase.client_id === user.client_id)
        : [],
    staffHiddenClientIds: user?.role === "pai_de_santo"
      ? state.staffHiddenClientIds.filter((id) => clientIds.has(id))
      : [],
    staffHiddenAt: user?.role === "pai_de_santo"
      ? Object.fromEntries(
          Object.entries(state.staffHiddenAt).filter(([id]) => clientIds.has(id)),
        )
      : {},
  };
}

function persistAppState(
  state: AppState,
  user: Profile | null,
  cacheUser: Profile | null = user,
) {
  const scoped = scopePrivateState(state, user);
  const cachedPrivate = scopePrivateState(state, cacheUser);
  const persisted = {
    ...scoped,
    clients: [],
    appointments: [],
    messages: [],
    internalNotes: [],
    shopPurchases: [],
    notifications: scoped.notifications.filter(
      (notification) => !["chat", "agenda", "atendimento", "financeiro"].includes(notification.type),
    ),
    profiles: scoped.profiles.filter((profile) => profile.role !== "cliente"),
    staffHiddenClientIds: [],
    staffHiddenAt: {},
  };
  persistSharedData(stripSession(persisted));
  // Persistência privada local:
  // - sem Supabase (demo puro);
  // - override de demo no Preview;
  // - Jogo ainda em modo local (JOGO_REMOTE off): visitante precisa gravar o hold
  //   no blob do Pai, senão a ficha falha com "Reserva não encontrada ou expirada".
  const localPrivateOk =
    !isSupabaseConfigured() ||
    isDemoOverrideActive() ||
    !isJogoRemoteEnabled();
  persistPrivateData(
    localPrivateOk && (cacheUser?.role === "pai_de_santo" || cacheUser?.role === "cliente" || cacheUser?.role === "tesouraria")
      ? cacheUser.id
      : null,
    localPrivateOk && (cacheUser?.role === "pai_de_santo" || cacheUser?.role === "cliente" || cacheUser?.role === "tesouraria")
      ? {
          clients: cachedPrivate.clients,
          appointments: cachedPrivate.appointments,
          messages: cachedPrivate.messages,
          internalNotes: cachedPrivate.internalNotes,
          shopPurchases: cachedPrivate.shopPurchases,
          notifications: cachedPrivate.notifications,
          profiles: cachedPrivate.profiles.filter((profile) => profile.role === "cliente"),
        }
      : undefined,
  );
  persistSessionUserId(scoped.currentUserId);
  return scoped;
}

function initialAppState(initialUserId: string | null, authMode: boolean): AppState {
  const userId = loadSessionUserId() ?? initialUserId;
  const shared = loadSharedData();
  if (authMode) return scopePrivateState(toAppState(shared, userId), null);

  const seed = createSeedState();
  const user = [...shared.profiles, ...seed.profiles].find((profile) => profile.id === userId) ?? null;
  const seedProfile = seed.profiles.find((profile) => profile.id === userId);
  const saved = loadPrivateData(userId);
  const privateData = saved.clients
    ? saved
    : user?.role === "pai_de_santo"
      ? {
          clients: seed.clients,
          appointments: seed.appointments,
          messages: seed.messages,
          internalNotes: seed.internalNotes,
          shopPurchases: seed.shopPurchases,
          notifications: seed.notifications,
          profiles: seed.profiles.filter((profile) => profile.role === "cliente"),
        }
      : user?.role === "cliente" && user.client_id
        ? {
            clients: seed.clients.filter((client) => client.id === user.client_id),
            appointments: seed.appointments.filter((item) => item.client_id === user.client_id),
            messages: seed.messages.filter((item) => item.client_id === user.client_id),
            internalNotes: [],
            shopPurchases: seed.shopPurchases.filter((purchase) => purchase.client_id === user.client_id),
            notifications: seed.notifications.filter(
              (item) => item.related_id === user.client_id || item.user_id === user.id,
            ),
            profiles: seed.profiles.filter((profile) => profile.id === user.id),
          }
        : user?.role === "tesouraria"
          ? {
              shopPurchases: seed.shopPurchases,
              notifications: seed.notifications.filter((item) => item.audience?.includes("tesouraria")),
              profiles: seed.profiles.filter((profile) => profile.role === "tesouraria"),
            }
          : {};
  const profiles = Array.from(
    new Map(
      [
        ...shared.profiles,
        ...(privateData.profiles ?? []),
        ...(seedProfile ? [seedProfile] : []),
      ].map((profile) => [profile.id, profile]),
    ).values(),
  );
  return scopePrivateState(
    toAppState({ ...shared, ...privateData, profiles }, userId),
    user,
  );
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
  const [state, setState] = useState<AppState>(() => initialAppState(initialUserId, authMode));
  // Espelho síncrono — commit() precisa ler o estado atual sem flushSync (React 19).
  const stateRef = useRef(state);
  stateRef.current = state;
  // Com Supabase: não liberar o shell até a 1ª leitura da sessão
  // (senão o AppShell manda pra / porque o perfil Auth ainda não chegou).
  const [ready, setReady] = useState(!authMode);

  useEffect(() => {
    // Re-sincroniza (outra aba pode ter gravado dados)
    try {
      const data = loadSharedData();
      const userId = loadSessionUserId();
      setState((prev) => {
        const resolvedUserId = userId ?? initialUserId;
        const privateData = authMode ? {} : loadPrivateData(resolvedUserId);
        const next = toAppState({ ...data, ...privateData }, resolvedUserId);
        const user = next.profiles.find((profile) => profile.id === next.currentUserId) ?? null;
        return persistAppState(next, user);
      });
    } catch {
      // ignore
    }
    if (!isSupabaseConfigured()) setReady(true);
  }, [authMode, initialUserId]);

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
        // Mantém sessão seed (pai@ileoloroke.demo) se o Auth remoto estiver vazio.
        const demoId = readDemoOverrideId();
        if (demoId) {
          setState((prev) => {
            const seed = createSeedState();
            const profile =
              prev.profiles.find((p) => p.id === demoId) ??
              seed.profiles.find((p) => p.id === demoId) ??
              null;
            if (!profile) {
              writeDemoOverrideId(null);
              return persistAppState({ ...prev, currentUserId: null }, null);
            }
            const profiles = mergeAuthProfile(prev.profiles, profile);
            const saved = loadPrivateData(demoId);
            return persistAppState(
              {
                ...prev,
                profiles,
                clients: saved.clients ?? prev.clients,
                appointments: saved.appointments ?? prev.appointments,
                messages: saved.messages ?? prev.messages,
                internalNotes: saved.internalNotes ?? prev.internalNotes,
                notifications: saved.notifications ?? prev.notifications,
                currentUserId: demoId,
              },
              profile,
            );
          });
          markReady();
          return;
        }
        setState((prev) => {
          const next = { ...prev, currentUserId: null };
          return persistAppState(next, null);
        });
        markReady();
        return;
      }
      let row = await fetchProfileRow(supabase!, userId);
      if (cancelled) return;
      if (!row) {
        setState((prev) => {
          const next = { ...prev, currentUserId: null };
          return persistAppState(next, null);
        });
        markReady();
        return;
      }

      // Conta Auth de cliente sem ficha → cria clients + client_id
      if (row.role === "cliente" && !row.client_id) {
        row = await ensureClienteLinked(supabase!, row);
      }

      const baseProfile = mapProfileRow(row);
      const viewAs = paiCanOpenArea(baseProfile.role) ? readViewAsArea() : null;
      const authProfile = actingProfileForArea(baseProfile, viewAs);
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
        const next = persistAppState({
          ...prev,
          profiles,
          clients,
          messages,
          currentUserId: authProfile.id,
        }, authProfile);
        return next;
      });
      markReady();
    }

    // getSession é mais estável no celular que getUser no 1º paint
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) void applyUser(data.session.user.id);
      else void applyUser(null, { allowClear: true });
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
        setState((prev) => {
          const next = toAppState(shared, prev.currentUserId);
          const user = next.profiles.find((profile) => profile.id === next.currentUserId) ?? null;
          return scopePrivateState(next, user);
        });
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

      const activeProfile = state.profiles.find((profile) => profile.id === state.currentUserId);
      const canReadPrivate = activeProfile?.role === "pai_de_santo" || activeProfile?.role === "cliente";
      const [libRes, msgRes, clientsRes, blogRes, eduRes, shopRes] = await Promise.all([
      fetchLibraryItems(supabase),
        canReadPrivate ? fetchChatMessages(supabase) : Promise.resolve({ ok: true as const, items: [] }),
        canReadPrivate ? fetchClientsRemote(supabase) : Promise.resolve({ ok: true as const, items: [] }),
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
      if (canReadPrivate) {
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
        } else if ("error" in msgRes) {
          console.warn("[chat] sync:", msgRes.error);
        }
      }
      if (canReadPrivate) {
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
        } else if ("error" in clientsRes) {
          console.warn("[clients] sync:", clientsRes.error);
        }
      }
      next = {
        ...next,
        clients: ensureClientsFromMessages(next.clients ?? [], next.messages ?? []),
      };
      return persistAppState(next, activeProfile ?? null);
    });
  }, [authMode, state.currentUserId, state.profiles]);

  // Biblioteca + chat + clientes na nuvem (Supabase)
  useEffect(() => {
    if (!ready || !authMode || !state.currentUserId) return;
    const activeProfile = state.profiles.find((profile) => profile.id === state.currentUserId);
    if (activeProfile?.role !== "pai_de_santo" && activeProfile?.role !== "cliente") return;
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
  }, [ready, authMode, state.currentUserId, state.profiles, refreshCloudChat]);

  /**
   * Persistência síncrona sem flushSync (proibido no lifecycle do React 19).
   * Roda o updater imediatamente em stateRef para que holdGuestJogo / etc.
   * possam ler { ok, error } no mesmo tick.
   */
  const commit = useCallback((updater: (prev: AppState) => AppState, cacheUser?: Profile) => {
    const prev = stateRef.current;
    const next = updater(prev);
    if (next === prev) return;
    const user = next.profiles.find((profile) => profile.id === next.currentUserId) ?? null;
    const privateCacheUser = user
      ? user.role === "pai_de_santo"
        ? user
        : null
      : cacheUser ?? null;
    const persisted = persistAppState(next, user, privateCacheUser);
    stateRef.current = persisted;
    setState(persisted);
  }, []);

  const currentUser = useMemo(() => {
    const base = state.profiles.find((p) => p.id === state.currentUserId) ?? null;
    if (!base) return null;
    const viewAs = readViewAsArea();
    if (!viewAs) return base;
    if (paiCanOpenArea(base.role)) return actingProfileForArea(base, viewAs);
    return base;
  }, [state.profiles, state.currentUserId]);

  useEffect(() => {
    if (currentUser) clearGuestChatSession();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!ready || !currentUser || currentUser.person_kind !== "filho_de_santo") return;
    const linked = state.members.some((m) => m.profile_id === currentUser.id);
    if (linked) return;
    commit((prev) => ensureFilhoMemberState(prev, currentUser));
  }, [ready, currentUser, state.members, commit]);

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
      let next: AppState = {
        ...prev,
        profiles,
        clients,
        messages,
        currentUserId: profile.id,
      };
      next = ensureFilhoMemberState(next, profile);
      return persistAppState(next, profile);
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
    writeViewAsArea(null);
    writeDemoOverrideId(null);
    clearGuestChatSession();
    clearLocalPushFlags();
    if (isSupabaseConfigured()) {
      const supabase = createBrowserClient();
      void supabase?.auth.signOut();
    }
    commit((prev) => ({ ...prev, currentUserId: null }));
  }, [commit]);

  const resetDemo = useCallback(() => {
    const seed = createSeedState();
    setState((prev) => {
      const next = toAppState(stripSession(seed), prev.currentUserId);
      const user = next.profiles.find((profile) => profile.id === next.currentUserId) ?? null;
      return persistAppState(next, user);
    });
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
        delivery: "conta" as const,
        status: "solicitado" as const,
        created_at: stamp,
        updated_at: stamp,
      };
      const staffNote = {
        id: uid("ntf"),
        title: "Nova compra na loja",
        body: `${currentUser.full_name} pediu: ${product.name} (R$ ${product.price.toFixed(2)}) — liberar na conta.`,
        type: "financeiro" as const,
        audience: ["tesouraria", "pai_de_santo"] as UserRole[],
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
          delivery: "conta",
          status: "solicitado",
          created_at: stamp,
          updated_at: stamp,
        });
      }
      return { ok: true };
    },
    [commit, currentUser, state.shopProducts, state.shopPurchases],
  );

  const requestShopPurchaseGuest: AppStore["requestShopPurchaseGuest"] = useCallback(
    (productId, invoice) => {
      const product = (state.shopProducts ?? []).find((p) => p.id === productId);
      if (!product || !product.available) {
        return { ok: false, error: "Produto indisponível." };
      }
      const full_name = invoice.full_name.trim();
      const email = invoice.email.trim().toLowerCase();
      const cpf_cnpj = invoice.cpf_cnpj.trim();
      if (full_name.length < 3) return { ok: false, error: "Informe o nome completo." };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "E-mail inválido para NF e envio." };
      }
      if (cpf_cnpj.replace(/\D/g, "").length < 11) {
        return { ok: false, error: "Informe CPF ou CNPJ para a nota fiscal." };
      }
      const existing = (state.shopPurchases ?? []).find(
        (p) =>
          p.product_id === productId &&
          p.guest_email === email &&
          (p.status === "solicitado" || p.status === "pago_liberado"),
      );
      if (existing?.status === "solicitado") {
        return { ok: false, error: "Já existe pedido com este e-mail — aguarde a liberação." };
      }
      const stamp = nowIso();
      const invoiceClean: ShopInvoiceForm = {
        full_name,
        email,
        cpf_cnpj,
        phone: invoice.phone?.trim() || undefined,
        address: invoice.address?.trim() || undefined,
        city: invoice.city?.trim() || undefined,
        state: invoice.state?.trim() || undefined,
        zip: invoice.zip?.trim() || undefined,
      };
      const purchase = {
        id: isSupabaseConfigured() ? crypto.randomUUID() : uid("buy"),
        product_id: productId,
        delivery: "email" as const,
        guest_email: email,
        invoice: invoiceClean,
        status: "solicitado" as const,
        created_at: stamp,
        updated_at: stamp,
      };
      const staffNote = {
        id: uid("ntf"),
        title: "Compra sem conta (e-mail + NF)",
        body: `${full_name} (${email}) pediu ${product.name} — enviar por e-mail após Pix/NF.`,
        type: "financeiro" as const,
        audience: ["tesouraria", "pai_de_santo"] as UserRole[],
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
      if (isSupabaseConfigured() && isUuid(productId)) {
        const supabase = createBrowserClient();
        void supabase?.from("shop_purchases").insert({
          id: purchase.id,
          product_id: productId,
          client_id: null,
          delivery: "email",
          guest_email: email,
          invoice: invoiceClean,
          status: "solicitado",
          created_at: stamp,
          updated_at: stamp,
        });
      }
      return { ok: true };
    },
    [commit, state.shopProducts, state.shopPurchases],
  );

  const releaseShopPurchase: AppStore["releaseShopPurchase"] = useCallback(
    (purchaseId) => {
      if (
        !currentUser ||
        (currentUser.role !== "tesouraria" &&
          currentUser.role !== "pai_de_santo")
      ) {
        return { ok: false, error: "Só Pai, Financeiro ou Admin libera compras." };
      }
      let ok = false;
      commit((prev) => {
        const purchase = (prev.shopPurchases ?? []).find((p) => p.id === purchaseId);
        if (!purchase || purchase.status !== "solicitado") return prev;
        ok = true;
        const stamp = nowIso();
        const product = (prev.shopProducts ?? []).find((p) => p.id === purchase.product_id);
        const byEmail = purchase.delivery === "email" || !purchase.client_id;
        const notes = [];
        if (byEmail) {
          notes.push({
            id: uid("ntf"),
            title: "Enviar conteúdo por e-mail",
            body: `${product?.name ?? "Produto"} → ${purchase.guest_email ?? purchase.invoice?.email ?? "e-mail"}. Use a ficha NF do pedido.`,
            type: "financeiro" as const,
            audience: ["tesouraria", "pai_de_santo"] as UserRole[],
            related_id: purchase.id,
            read: false,
            href: "/loja/liberacoes",
            created_at: stamp,
          });
        } else {
          notes.push({
            id: uid("ntf"),
            title: "Conteúdo liberado na conta",
            body: `${product?.name ?? "Produto"} já aparece na loja do cliente.`,
            type: "financeiro" as const,
            audience: ["cliente"] as UserRole[],
            related_id: purchase.client_id,
            read: false,
            href: "/cliente/loja",
            created_at: stamp,
          });
        }
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
          notifications: [...notes, ...prev.notifications],
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
        (currentUser.role !== "tesouraria" &&
          currentUser.role !== "administrador" &&
          currentUser.role !== "pai_de_santo")
      ) {
        return { ok: false, error: "Só Pai, Financeiro ou Admin pode recusar." };
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
        const notifications = [...prev.notifications];
        if (created.status === "AGUARDANDO" && member.profile_id) {
          notifications.unshift({
            id: uid("ntf"),
            title: "Nova mensalidade",
            body: `Cobrança de ${formatCompetence(competence)} — R$ ${member.monthly_fee_amount
              .toFixed(2)
              .replace(".", ",")}.`,
            type: "financeiro",
            audience: ["cliente"],
            related_id: member.profile_id,
            read: false,
            href: "/filho/mensalidade",
            created_at: stamp,
          });
        }
        return {
          ...prev,
          monthlyFees: [created, ...prev.monthlyFees],
          notifications,
        };
      });
      return created;
    },
    [commit],
  );

  const confirmFeePayment: AppStore["confirmFeePayment"] = useCallback(
    (feeId, input) => {
      let updated: MonthlyFee | null = null;
      const receiptBox: { current: FeeReceipt | null } = { current: null };
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
        const receipt: FeeReceipt = {
          id: uid("rcp"),
          monthly_fee_id: fee.id,
          member_id: fee.member_id,
          profile_id: member?.profile_id,
          number: `RC-${fee.id.slice(-8).toUpperCase()}`,
          payer_name: member?.full_name ?? "Membro",
          payer_email: member?.email,
          competence: fee.competence,
          amount: input.amount,
          payment_method: input.method,
          paid_at: stamp,
          email_sent: false,
          created_at: stamp,
        };
        receiptBox.current = receipt;
        const staffNote: AppNotification = {
          id: uid("ntf"),
          title: "Pagamento confirmado",
          body: `${member?.full_name ?? "Membro"} — ${formatCompetence(fee.competence)}.`,
          type: "financeiro",
          audience: ["tesouraria", "administrador"],
          read: false,
          href: `/membros/${fee.member_id}`,
          created_at: stamp,
        };
        const notifications = [staffNote, ...prev.notifications];
        if (member?.profile_id) {
          notifications.unshift({
            id: uid("ntf"),
            title: "Comprovante disponível",
            body: `Mensalidade ${formatCompetence(fee.competence)} paga. Recibo ${receipt.number}.`,
            type: "financeiro",
            audience: ["cliente"],
            related_id: member.profile_id,
            read: false,
            href: `/filho/mensalidade?recibo=${receipt.id}`,
            created_at: stamp,
          });
        }
        return {
          ...prev,
          monthlyFees: prev.monthlyFees.map((f) => (f.id === feeId ? updated! : f)),
          feeReceipts: [receipt, ...(prev.feeReceipts ?? [])],
          notifications,
        };
      });

      const snap = receiptBox.current;
      if (snap?.payer_email) {
        void fetch("/api/email/fee-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: snap.payer_email,
            receipt: snap,
          }),
        })
          .then(async (res) => {
            const data = (await res.json().catch(() => ({}))) as {
              ok?: boolean;
              error?: string;
            };
            commit((prev) => ({
              ...prev,
              feeReceipts: (prev.feeReceipts ?? []).map((r) =>
                r.id === snap.id
                  ? {
                      ...r,
                      email_sent: Boolean(data.ok),
                      email_error: data.ok ? undefined : data.error || "Falha no envio",
                    }
                  : r,
              ),
            }));
          })
          .catch(() => {
            commit((prev) => ({
              ...prev,
              feeReceipts: (prev.feeReceipts ?? []).map((r) =>
                r.id === snap.id
                  ? { ...r, email_sent: false, email_error: "Falha no envio" }
                  : r,
              ),
            }));
          });
      }

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
    async (input) => {
      if (currentUser?.role !== "pai_de_santo") return null;
      const stamp = nowIso();
      let saved: Client | null = null;
      const existing = input.id
        ? state.clients.find((client) => client.id === input.id)
        : undefined;
      if (input.id && (!existing || existing.responsible_profile_id !== currentUser.id)) {
        return null;
      }
      const clientId = existing?.id ?? (isSupabaseConfigured() ? crypto.randomUUID() : uid("cli"));
      const row = {
        ...existing,
        ...input,
        id: clientId,
        responsible_profile_id: currentUser.id,
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp,
      } as Client;

      if (isSupabaseConfigured()) {
        const supabase = createBrowserClient();
        if (!supabase) return null;
        const { data, error } = existing
          ? await supabase.rpc("update_owned_client", {
              p_client_id: clientId,
              p_full_name: row.full_name,
              p_phone: row.phone,
              p_email: row.email ?? null,
              p_notes: row.notes ?? null,
            })
          : await supabase
              .from("clients")
              .insert({
                id: clientId,
                responsible_profile_id: currentUser.id,
                full_name: row.full_name,
                phone: row.phone,
                email: row.email ?? null,
                notes: row.notes ?? null,
                registration_complete: false,
                created_at: stamp,
                updated_at: stamp,
              })
              .select("*")
              .single();
        if (error || !data) return null;
        saved = {
          ...row,
          ...data,
          responsible_profile_id: currentUser.id,
        } as Client;
      } else {
        saved = row;
      }

      commit((prev) => ({
        ...prev,
        clients: existing
          ? prev.clients.map((client) => (client.id === clientId ? saved! : client))
          : [saved!, ...prev.clients],
      }));
      return saved;
    },
    [commit, currentUser, state.clients],
  );

  const claimUnassignedClient: AppStore["claimUnassignedClient"] = useCallback(
    async (clientId) => {
      if (currentUser?.role !== "pai_de_santo") return false;
      if (isSupabaseConfigured()) {
        const supabase = createBrowserClient();
        if (!supabase) return false;
        const { error } = await supabase.rpc("claim_unassigned_client", {
          p_client_id: clientId,
        });
        return !error;
      }
      let claimed = false;
      commit((prev) => {
        const client = prev.clients.find((item) => item.id === clientId);
        if (!client || client.responsible_profile_id) return prev;
        claimed = true;
        return {
          ...prev,
          clients: prev.clients.map((item) =>
            item.id === clientId
              ? { ...item, responsible_profile_id: currentUser.id, updated_at: nowIso() }
              : item,
          ),
        };
      });
      return claimed;
    },
    [commit, currentUser],
  );

  const removeClient: AppStore["removeClient"] = useCallback(
    async (id) => {
      if (
        !currentUser ||
        currentUser.role !== "pai_de_santo"
      ) {
        return { ok: false, error: "Sem permissão para excluir cliente." };
      }
      const target = state.clients.find((client) => client.id === id);
      if (!target || target.responsible_profile_id !== currentUser.id) {
        return { ok: false, error: "Acesso não autorizado." };
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
    [commit, currentUser, state.clients],
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
      if (
        currentUser?.role !== "pai_de_santo" &&
        !(currentUser?.role === "cliente" && currentUser.client_id === input.client_id)
      ) {
        return { ok: false, error: "Acesso não autorizado." };
      }
      let result: ReturnType<AppStore["createAppointment"]> = {
        ok: false,
        error: "Falha ao criar.",
      };
      commit((prev) => {
        const targetClient = prev.clients.find((item) => item.id === input.client_id);
        const isAllowed = currentUser?.role === "pai_de_santo"
          ? targetClient?.responsible_profile_id === currentUser.id
          : currentUser?.role === "cliente" && currentUser.client_id === input.client_id;
        if (!isAllowed) {
          result = { ok: false, error: "Acesso não autorizado." };
          return prev;
        }
        const published = (prev.publishedSlots ?? []).some(
          (s) => s.scheduled_at === input.scheduled_at,
        );
        if (!published) {
          result = { ok: false, error: "Este horário não está disponível na agenda da casa." };
          return prev;
        }
        if (
          isSlotOccupied(
            input.scheduled_at,
            prev.appointments,
            prev.jogoSlotHolds,
          )
        ) {
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
          audience: ["pai_de_santo"],
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
    [commit, currentUser],
  );

  const seedPai = () =>
    createSeedState().profiles.find((profile) => profile.role === "pai_de_santo");

  /** Mescla blob privado do Pai quando o visitante (sem login) grava um Jogo. */
  function withPaiPrivateBase(prev: AppState): AppState {
    const pai =
      prev.profiles.find((profile) => profile.role === "pai_de_santo") ?? seedPai();
    if (!pai) return prev;
    const saved = loadPrivateData(pai.id);
    if (!saved.appointments && !saved.clients && !saved.messages) return prev;
    const clients = new Map(prev.clients.map((c) => [c.id, c]));
    for (const c of saved.clients ?? []) clients.set(c.id, c);
    const appointments = new Map(prev.appointments.map((a) => [a.id, a]));
    for (const a of saved.appointments ?? []) appointments.set(a.id, a);
    const messages = new Map(prev.messages.map((m) => [m.id, m]));
    for (const m of saved.messages ?? []) messages.set(m.id, m);
    return {
      ...prev,
      clients: [...clients.values()],
      appointments: [...appointments.values()],
      messages: [...messages.values()],
      notifications: [
        ...(saved.notifications ?? []).filter(
          (n) => !prev.notifications.some((p) => p.id === n.id),
        ),
        ...prev.notifications,
      ],
    };
  }

  const bookGuestAppointment: AppStore["bookGuestAppointment"] = useCallback(
    (input) => {
      const name = input.ficha.full_name.trim();
      const phone = input.ficha.phone.trim();
      if (name.length < 3) {
        return { ok: false, error: "Informe seu nome completo." };
      }
      if (phone.length < 8) {
        return { ok: false, error: "Informe um telefone válido." };
      }

      let result: ReturnType<AppStore["bookGuestAppointment"]> = {
        ok: false,
        error: "Falha ao marcar.",
      };

      commit((rawPrev) => {
        const prev = withPaiPrivateBase(rawPrev);
        const published = (prev.publishedSlots ?? []).some(
          (s) => s.scheduled_at === input.scheduled_at,
        );
        if (!published) {
          result = {
            ok: false,
            error: "Este horário não está mais disponível.",
          };
          return prev;
        }
        if (
          isSlotOccupied(
            input.scheduled_at,
            prev.appointments,
            prev.jogoSlotHolds,
          )
        ) {
          result = { ok: false, error: "Este horário acabou de ser preenchido." };
          return prev;
        }

        const stamp = nowIso();
        const slot = prev.publishedSlots.find((s) => s.scheduled_at === input.scheduled_at);
        const clientId = uid("cli");
        const aptId = uid("apt");
        const fichaCode = `FC-${aptId.slice(-8).toUpperCase()}`;
        const amount = input.amount ?? prev.houseSettings?.jogo_amount ?? DEFAULT_JOGO_AMOUNT;
        const modalidade = input.modalidade ?? "online";
        const guestClient: Client = {
          id: clientId,
          responsible_profile_id:
            prev.profiles.find((profile) => profile.role === "pai_de_santo")?.id,
          full_name: name,
          phone,
          email: input.ficha.email?.trim() || undefined,
          birth_date: input.ficha.birth_date || undefined,
          registration_complete: true,
          is_guest: true,
          notes: "Marcação pública (sem conta)",
          created_at: stamp,
          updated_at: stamp,
        };
        const appointment: Appointment = {
          id: aptId,
          client_id: clientId,
          scheduled_at: input.scheduled_at,
          duration_minutes: slot?.duration_minutes ?? 60,
          status: "SOLICITADO",
          amount,
          modalidade,
          jogo_status: "aguardando_pagamento",
          hold_expires_at: holdExpiresAt(new Date(stamp)),
          ficha_code: fichaCode,
          guest_ficha: {
            full_name: name,
            phone,
            email: input.ficha.email?.trim() || undefined,
            birth_date: input.ficha.birth_date || undefined,
            observation: input.ficha.observation?.trim() || undefined,
            privacy_accepted: input.ficha.privacy_accepted,
            privacy_accepted_at: input.ficha.privacy_accepted
              ? stamp
              : undefined,
          },
          pai_only_ficha: true,
          chat_unlocked: false,
          created_at: stamp,
          updated_at: stamp,
        };
        const notification: AppNotification = {
          id: uid("ntf"),
          title: "Nova solicitação de Jogo",
          body: `Horário pendente · código ${fichaCode}. Sem dados sensíveis neste aviso.`,
          type: "agenda",
          audience: ["pai_de_santo"],
          related_id: aptId,
          read: false,
          href: `/atendimentos/${aptId}`,
          created_at: stamp,
        };
        result = {
          ok: true,
          appointment,
          ficha_code: fichaCode,
          client_id: clientId,
        };
        return {
          ...prev,
          clients: [guestClient, ...prev.clients],
          appointments: [appointment, ...prev.appointments],
          notifications: [notification, ...prev.notifications],
          jogoSlotHolds: upsertJogoSlotHold(prev.jogoSlotHolds, {
            appointment_id: aptId,
            scheduled_at: input.scheduled_at,
            expires_at: appointment.hold_expires_at!,
            jogo_status: "aguardando_pagamento",
            modalidade,
          }),
        };
      }, seedPai());

      return result;
    },
    [commit],
  );

  const mergeRemoteAppointmentCache = useCallback(
    (appointment: Appointment, clientPatch?: Partial<Client>) => {
      commit((rawPrev) => {
        const prev = withPaiPrivateBase(rawPrev);
        const stamp = nowIso();
        const existingClient = prev.clients.find((c) => c.id === appointment.client_id);
        const nextClient: Client = existingClient
          ? {
              ...existingClient,
              ...clientPatch,
              updated_at: stamp,
            }
          : {
              id: appointment.client_id,
              responsible_profile_id:
                clientPatch?.responsible_profile_id ??
                prev.profiles.find((p) => p.role === "pai_de_santo")?.id,
              full_name: clientPatch?.full_name ?? "Visitante (reserva)",
              phone: clientPatch?.phone ?? "pendente",
              email: clientPatch?.email,
              birth_date: clientPatch?.birth_date,
              is_guest: true,
              registration_complete: clientPatch?.registration_complete ?? false,
              notes: "Jogo remoto",
              created_at: stamp,
              updated_at: stamp,
            };
        const appointments = [
          appointment,
          ...prev.appointments.filter((a) => a.id !== appointment.id),
        ];
        const clients = [
          nextClient,
          ...prev.clients.filter((c) => c.id !== nextClient.id),
        ];
        const holds = isJogoOccupyingStatus(appointment.jogo_status)
          ? upsertJogoSlotHold(prev.jogoSlotHolds, {
              appointment_id: appointment.id,
              scheduled_at: appointment.scheduled_at,
              expires_at:
                appointment.jogo_status === "aguardando_pagamento"
                  ? appointment.hold_expires_at ?? holdExpiresAt()
                  : appointment.analysis_deadline_at ??
                    appointment.access_token_expires_at ??
                    holdExpiresAt(),
              jogo_status: appointment.jogo_status!,
              modalidade: appointment.modalidade,
            })
          : pruneJogoSlotHolds(prev.jogoSlotHolds).filter(
              (h) => h.appointment_id !== appointment.id,
            );
        return {
          ...prev,
          appointments,
          clients,
          jogoSlotHolds: holds,
        };
      }, seedPai());
    },
    [commit],
  );

  const holdGuestJogo: AppStore["holdGuestJogo"] = useCallback(
    async (input) => {
      if (isJogoRemoteEnabled()) {
        const remote = await remoteHoldJogo(input);
        if (!remote.ok) return remote;
        mergeRemoteAppointmentCache(remote.appointment, {
          full_name: "Visitante (reserva)",
          phone: "pendente",
          is_guest: true,
          registration_complete: false,
        });
        return {
          ok: true,
          appointment: remote.appointment,
          ficha_code: remote.ficha_code,
          client_id: remote.client_id,
          hold_expires_at: remote.hold_expires_at,
          guest_secret: remote.guest_secret,
        };
      }

      let result: Awaited<ReturnType<AppStore["holdGuestJogo"]>> = {
        ok: false,
        error: "Não foi possível reservar o horário.",
      };
      commit((rawPrev) => {
        const prev = withPaiPrivateBase(rawPrev);
        const published = (prev.publishedSlots ?? []).some(
          (s) => s.scheduled_at === input.scheduled_at,
        );
        if (!published) {
          result = { ok: false, error: "Este horário não está mais disponível." };
          return prev;
        }
        if (
          isSlotOccupied(
            input.scheduled_at,
            prev.appointments,
            prev.jogoSlotHolds,
          )
        ) {
          result = { ok: false, error: "Este horário acabou de ser preenchido." };
          return prev;
        }
        const stamp = nowIso();
        const expires = holdExpiresAt(new Date(stamp));
        const slot = prev.publishedSlots.find((s) => s.scheduled_at === input.scheduled_at);
        const clientId = uid("cli");
        const aptId = uid("apt");
        const fichaCode = `FC-${aptId.slice(-8).toUpperCase()}`;
        const amount =
          input.amount ?? prev.houseSettings?.jogo_amount ?? DEFAULT_JOGO_AMOUNT;
        const paiId =
          prev.profiles.find((profile) => profile.role === "pai_de_santo")?.id;
        const guestClient: Client = {
          id: clientId,
          responsible_profile_id: paiId,
          full_name: "Visitante (reserva)",
          phone: "pendente",
          is_guest: true,
          registration_complete: false,
          notes: "Reserva temporária de Jogo",
          created_at: stamp,
          updated_at: stamp,
        };
        const appointment: Appointment = {
          id: aptId,
          client_id: clientId,
          scheduled_at: input.scheduled_at,
          duration_minutes: slot?.duration_minutes ?? 60,
          status: "SOLICITADO",
          amount,
          modalidade: input.modalidade,
          jogo_status: "aguardando_pagamento",
          hold_expires_at: expires,
          ficha_code: fichaCode,
          pai_only_ficha: true,
          chat_unlocked: false,
          created_at: stamp,
          updated_at: stamp,
        };
        result = {
          ok: true,
          appointment,
          ficha_code: fichaCode,
          client_id: clientId,
          hold_expires_at: expires,
        };
        return {
          ...prev,
          clients: [guestClient, ...prev.clients],
          appointments: [appointment, ...prev.appointments],
          jogoSlotHolds: upsertJogoSlotHold(prev.jogoSlotHolds, {
            appointment_id: aptId,
            scheduled_at: input.scheduled_at,
            expires_at: expires,
            jogo_status: "aguardando_pagamento",
            modalidade: input.modalidade,
          }),
        };
      }, seedPai());
      return result;
    },
    [commit, mergeRemoteAppointmentCache],
  );

  const completeGuestJogoFicha: AppStore["completeGuestJogoFicha"] = useCallback(
    async (input) => {
      const name = input.ficha.full_name.trim();
      const phone = input.ficha.phone.trim();
      const email = input.ficha.email?.trim() ?? "";
      const birth = input.ficha.birth_date?.trim() ?? "";
      if (name.length < 3) return { ok: false, error: "Informe seu nome completo." };
      if (phone.length < 8) return { ok: false, error: "Informe um WhatsApp válido." };
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "Informe um e-mail válido." };
      }
      if (!birth) return { ok: false, error: "Informe a data de nascimento." };
      if (!input.ficha.privacy_accepted) {
        return { ok: false, error: "Aceite a Política de Privacidade para continuar." };
      }

      if (isJogoRemoteEnabled()) {
        if (!input.guest_secret) {
          return { ok: false, error: "Sessão do visitante inválida. Escolha o horário novamente." };
        }
        const remote = await remoteCompleteJogoFicha({
          appointment_id: input.appointment_id,
          guest_secret: input.guest_secret,
          ficha: {
            ...input.ficha,
            full_name: name,
            phone,
            email,
            birth_date: birth,
            privacy_accepted: true,
          },
        });
        if (!remote.ok) return remote;
        mergeRemoteAppointmentCache(remote.appointment, {
          full_name: name,
          phone,
          email,
          birth_date: birth,
          registration_complete: true,
          is_guest: true,
        });
        return remote;
      }

      let result: Awaited<ReturnType<AppStore["completeGuestJogoFicha"]>> = {
        ok: false,
        error: "Reserva não encontrada ou expirada.",
      };
      commit((rawPrev) => {
        const prev = withPaiPrivateBase(rawPrev);
        const apt = prev.appointments.find((a) => a.id === input.appointment_id);
        if (!apt || apt.pai_only_ficha !== true) return prev;
        if (
          apt.jogo_status &&
          !["aguardando_pagamento", "recusado"].includes(apt.jogo_status) &&
          !apt.requested_new_proof
        ) {
          result = { ok: false, error: "Esta solicitação não aceita mais edição." };
          return prev;
        }
        if (
          apt.hold_expires_at &&
          apt.jogo_status === "aguardando_pagamento" &&
          new Date(apt.hold_expires_at).getTime() < Date.now()
        ) {
          result = { ok: false, error: "A reserva temporária expirou. Escolha outro horário." };
          return prev;
        }
        const stamp = nowIso();
        const guest_ficha: AppointmentGuestFicha = {
          full_name: name,
          phone,
          email,
          birth_date: birth,
          observation: input.ficha.observation?.trim() || undefined,
          privacy_accepted: true,
          privacy_accepted_at: stamp,
        };
        const appointments = prev.appointments.map((a) =>
          a.id === apt.id
            ? { ...a, guest_ficha, updated_at: stamp }
            : a,
        );
        const clients = prev.clients.map((c) =>
          c.id === apt.client_id
            ? {
                ...c,
                full_name: name,
                phone,
                email,
                birth_date: birth,
                registration_complete: true,
                updated_at: stamp,
              }
            : c,
        );
        const updated = appointments.find((a) => a.id === apt.id)!;
        result = { ok: true, appointment: updated };
        return { ...prev, appointments, clients };
      }, seedPai());
      return result;
    },
    [commit, mergeRemoteAppointmentCache],
  );

  const attachGuestJogoProof: AppStore["attachGuestJogoProof"] = useCallback(
    async (input) => {
      if (isJogoRemoteEnabled()) {
        if (!input.file || !input.guest_secret) {
          return {
            ok: false,
            error: "Envie o comprovante com a sessão ativa do visitante.",
          };
        }
        const remote = await remoteUploadJogoComprovante({
          appointment_id: input.appointment_id,
          guest_secret: input.guest_secret,
          file: input.file,
        });
        if (!remote.ok) return remote;
        mergeRemoteAppointmentCache(remote.appointment);
        commit((rawPrev) => {
          const prev = withPaiPrivateBase(rawPrev);
          const stamp = nowIso();
          const notification: AppNotification = {
            id: uid("ntf"),
            title: "Comprovante de Jogo recebido",
            body: `Código ${remote.appointment.ficha_code ?? "—"} · análise em até 24h. Sem dados sensíveis neste aviso.`,
            type: "agenda",
            audience: ["pai_de_santo"],
            related_id: remote.appointment.id,
            read: false,
            href: `/atendimentos/${remote.appointment.id}`,
            created_at: stamp,
          };
          return {
            ...prev,
            notifications: [notification, ...prev.notifications],
          };
        }, seedPai());
        void notifyJogoPush({
          event: "JOGO_COMPROVANTE_RECEBIDO",
          jogo_id: remote.appointment.id,
          guest_secret: input.guest_secret,
        });
        return remote;
      }

      if (!input.proof) {
        return { ok: false, error: "Comprovante obrigatório." };
      }

      let result: Awaited<ReturnType<AppStore["attachGuestJogoProof"]>> = {
        ok: false,
        error: "Não foi possível enviar o comprovante.",
      };
      let pushJogoId: string | null = null;
      commit((rawPrev) => {
        const prev = withPaiPrivateBase(rawPrev);
        const apt = prev.appointments.find((a) => a.id === input.appointment_id);
        if (!apt?.guest_ficha?.email) {
          result = { ok: false, error: "Complete seus dados antes do comprovante." };
          return prev;
        }
        if (
          apt.jogo_status &&
          !["aguardando_pagamento", "recusado", "comprovante_enviado"].includes(
            apt.jogo_status,
          ) &&
          !apt.requested_new_proof
        ) {
          result = { ok: false, error: "Esta solicitação não aceita novo comprovante." };
          return prev;
        }
        const stamp = nowIso();
        const deadline = analysisDeadlineAt(stamp);
        const proof: JogoPaymentProof = {
          ...input.proof!,
          uploaded_at: stamp,
        };
        const appointments = prev.appointments.map((a) =>
          a.id === apt.id
            ? {
                ...a,
                payment_proof: proof,
                proof_uploaded_at: stamp,
                analysis_deadline_at: deadline,
                analysis_reminder_at: analysisReminderAt(deadline),
                analysis_deadline_reached: false,
                push_prazo_proximo_sent: false,
                push_prazo_atingido_sent: false,
                requested_new_proof: false,
                jogo_status: "aguardando_aprovacao" as JogoFlowStatus,
                last_email_event: "comprovante_recebido" as const,
                updated_at: stamp,
              }
            : a,
        );
        const updated = appointments.find((a) => a.id === apt.id)!;
        const notification: AppNotification = {
          id: uid("ntf"),
          title: "Comprovante de Jogo recebido",
          body: `Código ${apt.ficha_code ?? "—"} · análise em até 24h. Sem dados sensíveis neste aviso.`,
          type: "agenda",
          audience: ["pai_de_santo"],
          related_id: apt.id,
          read: false,
          href: `/atendimentos/${apt.id}`,
          created_at: stamp,
        };
        result = { ok: true, appointment: updated };
        pushJogoId = updated.id;
        return {
          ...prev,
          appointments,
          notifications: [notification, ...prev.notifications],
          jogoSlotHolds: upsertJogoSlotHold(prev.jogoSlotHolds, {
            appointment_id: apt.id,
            scheduled_at: apt.scheduled_at,
            expires_at: deadline,
            jogo_status: "aguardando_aprovacao",
            modalidade: apt.modalidade,
          }),
        };
      }, seedPai());
      if (pushJogoId) {
        void notifyJogoPush({
          event: "JOGO_COMPROVANTE_RECEBIDO",
          jogo_id: pushJogoId,
          guest_secret: input.guest_secret,
        });
      }
      return result;
    },
    [commit, mergeRemoteAppointmentCache],
  );

  const paiDecideJogo: AppStore["paiDecideJogo"] = useCallback(
    async (input) => {
      if (currentUser?.role !== "pai_de_santo") {
        return { ok: false, error: "Somente o Pai de Santo pode decidir sobre o Jogo." };
      }

      if (isJogoRemoteEnabled()) {
        const remote = await remoteDecidirJogo(input);
        if (!remote.ok) return remote;
        mergeRemoteAppointmentCache(remote.appointment);
        if (remote.access_token && remote.appointment.jogo_status === "confirmado") {
          commit((prev) => ({
            ...prev,
            jogoAccessIndex: upsertJogoAccessIndex(prev.jogoAccessIndex, {
              appointment_id: remote.appointment.id,
              access_token: remote.access_token!,
              expires_at:
                remote.appointment.access_token_expires_at ?? accessTokenExpiresAt(),
              revoked: false,
              jogo_status: "confirmado",
              scheduled_at: remote.appointment.scheduled_at,
              modalidade: remote.appointment.modalidade ?? "online",
              chat_unlocked: true,
              ficha_code: remote.appointment.ficha_code ?? "",
              amount: remote.appointment.amount,
            }),
          }));
        }
        // Push remoto já dispara em /api/jogo/decidir; reforço client-side com token só no request
        if (input.decision === "aprovar" && remote.access_token) {
          void notifyJogoPush({
            event: "JOGO_CONFIRMADO",
            jogo_id: remote.appointment.id,
            access_token: remote.access_token,
          });
        } else if (input.decision === "recusar") {
          void notifyJogoPush({
            event: "JOGO_RECUSADO",
            jogo_id: remote.appointment.id,
          });
        } else if (input.decision === "novo_comprovante") {
          void notifyJogoPush({
            event: "JOGO_NOVO_COMPROVANTE",
            jogo_id: remote.appointment.id,
          });
        }
        return remote;
      }

      let result: Awaited<ReturnType<AppStore["paiDecideJogo"]>> = {
        ok: false,
        error: "Atendimento não encontrado.",
      };
      let localPush:
        | {
            event: "JOGO_CONFIRMADO" | "JOGO_RECUSADO" | "JOGO_NOVO_COMPROVANTE";
            jogo_id: string;
            access_token?: string;
          }
        | null = null;
      commit((prev) => {
        const apt = prev.appointments.find((a) => a.id === input.appointment_id);
        const client = prev.clients.find((c) => c.id === apt?.client_id);
        if (!apt || !client) return prev;
        if (client.responsible_profile_id !== currentUser.id) {
          result = { ok: false, error: "Este Jogo não está sob sua responsabilidade." };
          return prev;
        }
        const stamp = nowIso();
        if (input.decision === "aprovar") {
          const token = createJogoAccessToken();
          const tokenExp = accessTokenExpiresAt(new Date(stamp));
          const appointments = prev.appointments.map((a) =>
            a.id === apt.id
              ? {
                  ...a,
                  status: "CONFIRMADO" as AppointmentStatus,
                  jogo_status: "confirmado" as JogoFlowStatus,
                  access_token: token,
                  access_token_expires_at: tokenExp,
                  access_token_revoked: false,
                  chat_unlocked: true,
                  enter_jogo_enabled: false,
                  last_email_event: "confirmado" as const,
                  updated_at: stamp,
                }
              : a,
          );
          const updated = appointments.find((a) => a.id === apt.id)!;
          const accessEntry: JogoAccessIndexEntry = {
            appointment_id: apt.id,
            access_token: token,
            expires_at: tokenExp,
            revoked: false,
            jogo_status: "confirmado",
            scheduled_at: apt.scheduled_at,
            modalidade: apt.modalidade ?? "online",
            chat_unlocked: true,
            ficha_code: apt.ficha_code ?? "",
            amount: apt.amount,
          };
          const notification: AppNotification = {
            id: uid("ntf"),
            title: "Jogo confirmado",
            body: `Código ${apt.ficha_code ?? "—"} confirmado. Sem dados sensíveis neste aviso.`,
            type: "agenda",
            audience: ["pai_de_santo"],
            related_id: apt.id,
            read: false,
            href: `/atendimentos/${apt.id}`,
            created_at: stamp,
          };
          result = {
            ok: true,
            appointment: updated,
            access_token: token,
            email_event: "confirmado",
          };
          localPush = {
            event: "JOGO_CONFIRMADO",
            jogo_id: updated.id,
            access_token: token,
          };
          return {
            ...prev,
            appointments,
            notifications: [notification, ...prev.notifications],
            jogoSlotHolds: upsertJogoSlotHold(prev.jogoSlotHolds, {
              appointment_id: apt.id,
              scheduled_at: apt.scheduled_at,
              expires_at: tokenExp,
              jogo_status: "confirmado",
              modalidade: apt.modalidade,
            }),
            jogoAccessIndex: upsertJogoAccessIndex(prev.jogoAccessIndex, accessEntry),
          };
        }

        if (input.decision === "novo_comprovante") {
          const appointments = prev.appointments.map((a) =>
            a.id === apt.id
              ? {
                  ...a,
                  jogo_status: "aguardando_pagamento" as JogoFlowStatus,
                  requested_new_proof: true,
                  refusal_note: input.note?.trim() || undefined,
                  last_email_event: "novo_comprovante" as const,
                  hold_expires_at: holdExpiresAt(new Date(stamp)),
                  updated_at: stamp,
                }
              : a,
          );
          const updated = appointments.find((a) => a.id === apt.id)!;
          result = {
            ok: true,
            appointment: updated,
            email_event: "novo_comprovante",
          };
          localPush = { event: "JOGO_NOVO_COMPROVANTE", jogo_id: updated.id };
          return {
            ...prev,
            appointments,
            jogoSlotHolds: upsertJogoSlotHold(prev.jogoSlotHolds, {
              appointment_id: apt.id,
              scheduled_at: apt.scheduled_at,
              expires_at: updated.hold_expires_at!,
              jogo_status: "aguardando_pagamento",
              modalidade: apt.modalidade,
            }),
          };
        }

        // recusar
        const appointments = prev.appointments.map((a) =>
          a.id === apt.id
            ? {
                ...a,
                status: "CANCELADO" as AppointmentStatus,
                jogo_status: "recusado" as JogoFlowStatus,
                refusal_note: input.note?.trim() || undefined,
                chat_unlocked: false,
                access_token_revoked: true,
                last_email_event: "recusado" as const,
                updated_at: stamp,
              }
            : a,
        );
        const updated = appointments.find((a) => a.id === apt.id)!;
        result = { ok: true, appointment: updated, email_event: "recusado" };
        localPush = { event: "JOGO_RECUSADO", jogo_id: updated.id };
        return {
          ...prev,
          appointments,
          jogoSlotHolds: pruneJogoSlotHolds(prev.jogoSlotHolds).filter(
            (h) => h.appointment_id !== apt.id,
          ),
          jogoAccessIndex: (prev.jogoAccessIndex ?? []).map((e) =>
            e.appointment_id === apt.id ? { ...e, revoked: true, jogo_status: "recusado" } : e,
          ),
        };
      });
      if (localPush) {
        void notifyJogoPush(localPush);
      }
      return result;
    },
    [commit, currentUser, mergeRemoteAppointmentCache],
  );

  const resolveJogoAccess: AppStore["resolveJogoAccess"] = useCallback(
    async (token) => {
      if (isJogoRemoteEnabled()) {
        const remote = await remoteResolveJogoAccess(token);
        if (!remote.ok) return null;
        commit((prev) => ({
          ...prev,
          jogoAccessIndex: upsertJogoAccessIndex(prev.jogoAccessIndex, remote.entry),
        }));
        return remote.entry;
      }
      return findJogoAccessByToken(state.jogoAccessIndex, token);
    },
    [commit, state.jogoAccessIndex],
  );

  const syncRemoteJogos: AppStore["syncRemoteJogos"] = useCallback(async () => {
    if (!isJogoRemoteEnabled()) {
      return { ok: false, error: "Persistência remota de Jogo desativada." };
    }
    const remote = await remoteSyncOwnedJogos();
    if (!remote.ok) return remote;
    commit((rawPrev) => {
      const prev = withPaiPrivateBase(rawPrev);
      const byIdApt = new Map(prev.appointments.map((a) => [a.id, a]));
      for (const apt of remote.appointments) {
        const existing = byIdApt.get(apt.id);
        byIdApt.set(apt.id, {
          ...existing,
          ...apt,
          // nunca reintroduzir data_url de demo no cache remoto
          payment_proof: apt.payment_proof
            ? { ...apt.payment_proof, data_url: undefined }
            : existing?.payment_proof
              ? { ...existing.payment_proof, data_url: undefined }
              : undefined,
        });
      }
      const byIdClient = new Map(prev.clients.map((c) => [c.id, c]));
      for (const client of remote.clients) {
        byIdClient.set(client.id, { ...byIdClient.get(client.id), ...client });
      }
      const appointments = Array.from(byIdApt.values());
      const holds = appointments
        .filter((a) => isJogoOccupyingStatus(a.jogo_status))
        .map((a) => ({
          appointment_id: a.id,
          scheduled_at: a.scheduled_at,
          expires_at:
            a.jogo_status === "aguardando_pagamento"
              ? a.hold_expires_at ?? holdExpiresAt()
              : a.analysis_deadline_at ?? a.access_token_expires_at ?? holdExpiresAt(),
          jogo_status: a.jogo_status!,
          modalidade: a.modalidade,
        }));
      return {
        ...prev,
        appointments,
        clients: Array.from(byIdClient.values()),
        jogoSlotHolds: holds,
      };
    }, seedPai());
    return { ok: true };
  }, [commit]);

  // Jogos remotos (Etapa 3) — cache sem data_url; só com NEXT_PUBLIC_JOGO_REMOTE=1
  useEffect(() => {
    if (!ready || !isJogoRemoteEnabled()) return;
    const activeProfile = state.profiles.find((profile) => profile.id === state.currentUserId);
    if (activeProfile?.role !== "pai_de_santo") return;
    let cancelled = false;
    void (async () => {
      const res = await syncRemoteJogos();
      if (cancelled || res.ok) return;
      console.warn("[jogo] sync remoto:", res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, state.currentUserId, state.profiles, syncRemoteJogos]);

  const refreshJogoDeadlines: AppStore["refreshJogoDeadlines"] = useCallback(() => {
    if (isJogoRemoteEnabled()) {
      void remoteListJogoOcupacao().then((remote) => {
        if (!remote.ok) return;
        commit((prev) => ({
          ...prev,
          jogoSlotHolds: remote.holds,
        }));
      });
    }
    const pendingPush: Array<{
      event:
        | "JOGO_PRAZO_PROXIMO"
        | "JOGO_PRAZO_ATINGIDO"
        | "JOGO_LEMBRETE_1H"
        | "JOGO_LEMBRETE_15MIN";
      jogo_id: string;
      access_token?: string;
    }> = [];
    commit((rawPrev) => {
      const prev = withPaiPrivateBase(rawPrev);
      const now = Date.now();
      let changed = false;
      const appointments = prev.appointments.map((a) => {
        let next = a;

        if (
          (a.jogo_status === "aguardando_aprovacao" ||
            a.jogo_status === "prazo_analise_atingido") &&
          a.analysis_reminder_at &&
          new Date(a.analysis_reminder_at).getTime() <= now &&
          !a.push_prazo_proximo_sent &&
          !(
            a.analysis_deadline_at &&
            new Date(a.analysis_deadline_at).getTime() <= now
          )
        ) {
          changed = true;
          pendingPush.push({ event: "JOGO_PRAZO_PROXIMO", jogo_id: a.id });
          next = { ...next, push_prazo_proximo_sent: true, updated_at: nowIso() };
        }

        if (
          a.jogo_status === "aguardando_aprovacao" &&
          a.analysis_deadline_at &&
          new Date(a.analysis_deadline_at).getTime() <= now &&
          !a.analysis_deadline_reached
        ) {
          changed = true;
          if (!a.push_prazo_atingido_sent) {
            pendingPush.push({ event: "JOGO_PRAZO_ATINGIDO", jogo_id: a.id });
          }
          next = {
            ...next,
            jogo_status: "prazo_analise_atingido" as JogoFlowStatus,
            analysis_deadline_reached: true,
            push_prazo_atingido_sent: true,
            updated_at: nowIso(),
          };
        } else if (
          a.jogo_status === "prazo_analise_atingido" &&
          !a.push_prazo_atingido_sent
        ) {
          changed = true;
          pendingPush.push({ event: "JOGO_PRAZO_ATINGIDO", jogo_id: a.id });
          next = { ...next, push_prazo_atingido_sent: true, updated_at: nowIso() };
        }

        if (a.jogo_status === "confirmado" && a.scheduled_at) {
          const ms = new Date(a.scheduled_at).getTime() - now;
          if (ms > 0 && ms <= 15 * 60_000 && !a.push_lembrete_15min_sent) {
            changed = true;
            pendingPush.push({
              event: "JOGO_LEMBRETE_15MIN",
              jogo_id: a.id,
              access_token: a.access_token,
            });
            next = { ...next, push_lembrete_15min_sent: true, updated_at: nowIso() };
          } else if (ms > 0 && ms <= 60 * 60_000 && !a.push_lembrete_1h_sent) {
            changed = true;
            pendingPush.push({
              event: "JOGO_LEMBRETE_1H",
              jogo_id: a.id,
              access_token: a.access_token,
            });
            next = { ...next, push_lembrete_1h_sent: true, updated_at: nowIso() };
          }
        }

        if (
          a.jogo_status === "aguardando_pagamento" &&
          a.hold_expires_at &&
          new Date(a.hold_expires_at).getTime() <= now
        ) {
          changed = true;
          next = {
            ...next,
            status: "CANCELADO" as AppointmentStatus,
            jogo_status: "cancelado" as JogoFlowStatus,
            updated_at: nowIso(),
          };
        }
        return next;
      });
      const rebuiltHolds = appointments
        .filter((a) => isJogoOccupyingStatus(a.jogo_status))
        .map((a) => ({
          appointment_id: a.id,
          scheduled_at: a.scheduled_at,
          expires_at:
            a.jogo_status === "aguardando_pagamento"
              ? a.hold_expires_at ?? holdExpiresAt()
              : a.analysis_deadline_at ?? a.access_token_expires_at ?? holdExpiresAt(),
          jogo_status: a.jogo_status!,
          modalidade: a.modalidade,
        }));
      const prunedOnly = pruneJogoSlotHolds(prev.jogoSlotHolds);
      if (!changed && prunedOnly.length === (prev.jogoSlotHolds ?? []).length) {
        return prev;
      }
      return {
        ...prev,
        appointments: changed ? appointments : prev.appointments,
        jogoSlotHolds: changed ? rebuiltHolds : prunedOnly,
      };
    }, seedPai());
    for (const p of pendingPush) {
      void notifyJogoPush(p);
    }
  }, [commit]);

  const ensureGuestChatClient: AppStore["ensureGuestChatClient"] = useCallback(
    (input) => {
      const name = input.full_name.trim();
      const phone = input.phone.trim();
      if (name.length < 3) return { ok: false, error: "Informe seu nome." };
      if (phone.length < 8) return { ok: false, error: "Informe um telefone com DDD." };

      let clientId = "";
      commit((prev) => {
        const existing = prev.clients.find(
          (c) =>
            c.is_guest &&
            c.phone.replace(/\D/g, "") === phone.replace(/\D/g, "") &&
            c.full_name.toLowerCase() === name.toLowerCase(),
        );
        if (existing) {
          clientId = existing.id;
          return prev;
        }
        const stamp = nowIso();
        clientId = uid("cli");
        const guest: Client = {
          id: clientId,
          responsible_profile_id:
            prev.profiles.find((profile) => profile.role === "pai_de_santo")?.id,
          full_name: name,
          phone,
          registration_complete: true,
          is_guest: true,
          notes: "Chat na marcação (sem conta)",
          created_at: stamp,
          updated_at: stamp,
        };
        return { ...prev, clients: [guest, ...prev.clients] };
      }, createSeedState().profiles.find((profile) => profile.role === "pai_de_santo"));
      return { ok: true, client_id: clientId };
    },
    [commit],
  );

  const sendGuestMessage: AppStore["sendGuestMessage"] = useCallback(
    (input) => {
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

      const message: Message = {
        id: uid("msg"),
        client_id: input.client_id,
        sender_role: "cliente",
        sender_name: input.guest_name.trim() || "Visitante",
        body,
        kind,
        audio_data_url: kind === "audio" ? input.audio_data_url : undefined,
        audio_duration_sec: kind === "audio" ? durationSec : undefined,
        video_data_url: kind === "video" ? input.video_data_url : undefined,
        call_url: kind === "call" ? input.call_url : undefined,
        created_at: stamp,
      };

      commit((prev) => {
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
          title: "Mensagem na marcação",
          body: `${message.sender_name}: ${preview}`,
          type: "chat",
          audience: ["pai_de_santo"],
          related_id: input.client_id,
          read: false,
          href: `/conversas/${input.client_id}`,
          created_at: stamp,
        };
        const hiddenMap = normalizeStaffHidden(
          prev.staffHiddenClientIds,
          prev.staffHiddenAt,
        );
        const nextHidden = unhideStaffChatInMap(hiddenMap, input.client_id);
        return {
          ...prev,
          messages: [...prev.messages, message],
          notifications: [notification, ...prev.notifications],
          staffHiddenAt: nextHidden,
          staffHiddenClientIds: Object.keys(nextHidden),
        };
      }, createSeedState().profiles.find((profile) => profile.role === "pai_de_santo"));
      return message;
    },
    [commit],
  );

  const updateAppointmentStatus: AppStore["updateAppointmentStatus"] = useCallback(
    (id, status) => {
      if (currentUser?.role !== "pai_de_santo") return null;
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
                audience: ["pai_de_santo"],
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
    [commit, currentUser],
  );

  const cancelAppointment: AppStore["cancelAppointment"] = useCallback(
    (id) => {
      if (currentUser?.role !== "pai_de_santo") return null;
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
          audience: ["pai_de_santo"],
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
    [commit, currentUser],
  );

  const patchAppointment: AppStore["patchAppointment"] = useCallback(
    (id, patch) => {
      if (currentUser?.role !== "pai_de_santo") return null;
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
    [commit, currentUser],
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
        if (
          isSlotOccupied(slot.scheduled_at, prev.appointments, prev.jogoSlotHolds)
        ) {
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
      if (currentUser?.role !== "pai_de_santo") return null;
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
    [commit, currentUser],
  );

  const finishAppointment: AppStore["finishAppointment"] = useCallback(
    (id) => {
      if (currentUser?.role !== "pai_de_santo") return null;
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
    [commit, currentUser],
  );

  const sendMessage: AppStore["sendMessage"] = useCallback(
    (input) => {
      if (
        !currentUser ||
        input.channel === "financeiro" ||
        (currentUser.role !== "pai_de_santo" && currentUser.role !== "cliente")
      ) return null;
      const targetClient = state.clients.find((client) => client.id === input.client_id);
      if (
        !targetClient ||
        (currentUser.role === "pai_de_santo" && targetClient.responsible_profile_id !== currentUser.id) ||
        (currentUser.role === "cliente" && currentUser.client_id !== input.client_id)
      ) return null;
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
        const guestThread = Boolean(client?.is_guest);
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
          audience: fromClient ? ["pai_de_santo"] : ["cliente"],
          related_id: input.client_id,
          read: false,
          href: fromClient
            ? `/conversas/${input.client_id}`
            : guestThread
              ? `/marcar/chat`
              : `/cliente/mensagens`,
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
            let audio_path = message.audio_path;
            let video_path = message.video_path;
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
              audio_path = up.path;
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
              video_path = up.path;
              video_data_url = undefined;
            }

            const remote = await insertMessageRemote(supabase, {
              ...message,
              audio_path,
              video_path,
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

            // Web Push: cliente → staff (Pai ou Financeiro) | staff → cliente
            if (currentUser.role === "cliente") {
              void fetch("/api/push/notify-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audience: "staff",
                  channel: "casa",
                  client_id: input.client_id,
                  preview: body,
                  sender_name: currentUser.full_name,
                }),
              }).catch(() => null);
            } else if (currentUser.role === "pai_de_santo") {
              void fetch("/api/push/notify-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audience: "cliente",
                  channel: "casa",
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
    [commit, currentUser, state.clients],
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
      const client = state.clients.find((item) => item.id === client_id);
      if (
        currentUser?.role !== "pai_de_santo" ||
        client?.responsible_profile_id !== currentUser.id
      ) return null;
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
    [commit, currentUser, state.clients],
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

  const requestAjodunAccess: AppStore["requestAjodunAccess"] = useCallback(
    (ajodunEventId) => {
      if (!currentUser || currentUser.role !== "cliente") {
        return { ok: false, error: "Faça login como Filho de Santo." };
      }
      const event = state.ajodunEvents?.find((e) => e.id === ajodunEventId);
      if (!event || !event.published) {
        return { ok: false, error: "Ajodun não encontrado." };
      }
      const existing = (state.ajodunMemberships ?? []).find(
        (m) => m.user_id === currentUser.id && m.ajodun_event_id === ajodunEventId,
      );
      if (existing?.status === "approved") {
        return { ok: false, error: "Você já tem acesso a este ajodun." };
      }
      if (existing?.status === "requested") {
        return { ok: false, error: "Pedido já enviado — aguardando liberação." };
      }
      const stamp = nowIso();
      const membership: AjodunMembership = {
        id: existing?.id ?? uid("ajm"),
        user_id: currentUser.id,
        ajodun_event_id: ajodunEventId,
        status: "requested",
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp,
      };
      commit((prev) => {
        const list = prev.ajodunMemberships ?? [];
        const without = list.filter((m) => m.id !== membership.id);
        const staffNote: AppNotification = {
          id: uid("ntf"),
          title: "Pedido de ajodun",
          body: `${currentUser.full_name} pediu acesso a “${event.title}”.`,
          type: "sistema",
          audience: ["administrador", "pai_de_santo"],
          read: false,
          href: "/ajodun/liberacoes",
          created_at: stamp,
        };
        return {
          ...prev,
          ajodunMemberships: [membership, ...without],
          notifications: [staffNote, ...prev.notifications],
        };
      });
      return { ok: true, membership };
    },
    [commit, currentUser, state.ajodunEvents, state.ajodunMemberships],
  );

  const decideAjodunMembership: AppStore["decideAjodunMembership"] = useCallback(
    (membershipId, decision) => {
      if (
        !currentUser ||
        (currentUser.role !== "administrador" && currentUser.role !== "pai_de_santo")
      ) {
        return { ok: false, error: "Só Admin ou Pai liberam ajodun." };
      }
      let ok = false;
      commit((prev) => {
        const row = (prev.ajodunMemberships ?? []).find((m) => m.id === membershipId);
        if (!row) return prev;
        ok = true;
        const stamp = nowIso();
        const event = (prev.ajodunEvents ?? []).find((e) => e.id === row.ajodun_event_id);
        const updated: AjodunMembership = {
          ...row,
          status: decision,
          updated_at: stamp,
          decided_by: currentUser.id,
        };
        const note: AppNotification = {
          id: uid("ntf"),
          title: decision === "approved" ? "Ajodun liberado" : "Ajodun recusado",
          body:
            decision === "approved"
              ? `Acesso liberado a “${event?.title ?? "ajodun"}”. Veja a planilha no app.`
              : `Pedido para “${event?.title ?? "ajodun"}” não foi liberado.`,
          type: "sistema",
          audience: ["cliente"],
          related_id: row.user_id,
          read: false,
          href: "/filho/ajodun",
          created_at: stamp,
        };
        return {
          ...prev,
          ajodunMemberships: (prev.ajodunMemberships ?? []).map((m) =>
            m.id === membershipId ? updated : m,
          ),
          notifications: [note, ...prev.notifications],
        };
      });
      return ok ? { ok: true } : { ok: false, error: "Pedido não encontrado." };
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

  const upsertOficina: AppStore["upsertOficina"] = useCallback(
    (input) => {
      if (!currentUser || !roleCanManageOficinas(currentUser.role)) {
        return { ok: false, error: "Sem permissão para gerenciar oficinas." };
      }
      const titulo = input.titulo.trim();
      const descricao = input.descricao_curta.trim();
      if (!titulo) return { ok: false, error: "Informe o título." };
      if (!descricao) return { ok: false, error: "Informe a descrição curta." };
      if (descricao.length > 120) {
        return { ok: false, error: "Descrição curta: máximo 120 caracteres." };
      }
      if (input.total_vagas < 0) {
        return { ok: false, error: "Quantidade de vagas inválida." };
      }

      let saved: Oficina | null = null;
      let error: string | undefined;
      let publishedNotify = false;

      commit((prev) => {
        const list = prev.oficinas ?? [];
        const existing = input.id ? list.find((o) => o.id === input.id) : undefined;
        const ocupadas = existing
          ? countOccupied(prev.inscricoesOficina ?? [], existing.id)
          : 0;
        if (
          existing &&
          input.total_vagas > 0 &&
          input.total_vagas < ocupadas
        ) {
          error = `Há ${ocupadas} inscritos confirmados. Não é possível reduzir para ${input.total_vagas} vagas.`;
          return prev;
        }

        const wasPublished = existing?.status === "Publicada";
        const nextStatus = input.status;
        publishedNotify =
          !wasPublished &&
          (nextStatus === "Publicada" || nextStatus === "Em breve");

        const now = nowIso();
        saved = {
          id: existing?.id ?? uid("ofc"),
          titulo,
          descricao_curta: descricao,
          sobre: input.sobre.trim(),
          conteudo: (input.conteudo ?? []).map((c) => c.trim()).filter(Boolean),
          imagem: input.imagem === null ? undefined : input.imagem ?? existing?.imagem,
          modalidade: input.modalidade,
          status: nextStatus,
          data: input.data || undefined,
          hora_inicio: input.hora_inicio || undefined,
          hora_fim: input.hora_fim || undefined,
          local: input.local || undefined,
          link: input.link || undefined,
          total_vagas: input.total_vagas,
          permitir_lista_espera: input.permitir_lista_espera,
          data_limite_inscricao: input.data_limite_inscricao || undefined,
          valor: input.valor ?? 0,
          criado_por: existing?.criado_por ?? currentUser.id,
          atualizado_por: currentUser.id,
          criado_em: existing?.criado_em ?? now,
          atualizado_em: now,
        };

        const oficinas = existing
          ? list.map((o) => (o.id === saved!.id ? saved! : o))
          : [saved, ...list];

        let notifications = prev.notifications ?? [];
        if (publishedNotify && saved) {
          const note: AppNotification = {
            id: uid("ntf"),
            title: "Nova oficina",
            body: `${saved.titulo} está disponível. Confira e inscreva-se.`,
            type: "oficina_publicada",
            related_id: saved.id,
            href: `/oficinas/${saved.id}`,
            read: false,
            created_at: now,
          };
          notifications = [note, ...notifications];
        }

        return { ...prev, oficinas, notifications };
      });

      if (error) return { ok: false, error };
      if (!saved) return { ok: false, error: "Falha ao salvar oficina." };
      return { ok: true, item: saved };
    },
    [commit, currentUser],
  );

  const duplicateOficina: AppStore["duplicateOficina"] = useCallback(
    (id) => {
      if (!currentUser || !roleCanManageOficinas(currentUser.role)) {
        return { ok: false, error: "Sem permissão." };
      }
      const source = (state.oficinas ?? []).find((o) => o.id === id);
      if (!source) return { ok: false, error: "Oficina não encontrada." };
      return upsertOficina({
        titulo: `${source.titulo} (cópia)`,
        descricao_curta: source.descricao_curta,
        sobre: source.sobre,
        conteudo: source.conteudo,
        imagem: source.imagem,
        modalidade: source.modalidade,
        status: "Rascunho",
        data: source.data,
        hora_inicio: source.hora_inicio,
        hora_fim: source.hora_fim,
        local: source.local,
        link: source.link,
        total_vagas: source.total_vagas,
        permitir_lista_espera: source.permitir_lista_espera,
        data_limite_inscricao: source.data_limite_inscricao,
        valor: source.valor,
      });
    },
    [currentUser, state.oficinas, upsertOficina],
  );

  const encerrarOficina: AppStore["encerrarOficina"] = useCallback(
    (id) => {
      const ofc = (state.oficinas ?? []).find((o) => o.id === id);
      if (!ofc) return { ok: false, error: "Oficina não encontrada." };
      if (!currentUser || !roleCanManageOficinas(currentUser.role)) {
        return { ok: false, error: "Sem permissão." };
      }
      return upsertOficina({
        id: ofc.id,
        titulo: ofc.titulo,
        descricao_curta: ofc.descricao_curta,
        sobre: ofc.sobre,
        conteudo: ofc.conteudo,
        imagem: ofc.imagem,
        modalidade: ofc.modalidade,
        status: "Encerrada",
        data: ofc.data,
        hora_inicio: ofc.hora_inicio,
        hora_fim: ofc.hora_fim,
        local: ofc.local,
        link: ofc.link,
        total_vagas: ofc.total_vagas,
        permitir_lista_espera: ofc.permitir_lista_espera,
        data_limite_inscricao: ofc.data_limite_inscricao,
        valor: ofc.valor,
      }).ok
        ? { ok: true }
        : { ok: false, error: "Não foi possível encerrar." };
    },
    [currentUser, state.oficinas, upsertOficina],
  );

  const removeOficina: AppStore["removeOficina"] = useCallback(
    (id) => {
      if (!currentUser || !roleCanManageOficinas(currentUser.role)) {
        return { ok: false, error: "Sem permissão." };
      }
      const ofc = (state.oficinas ?? []).find((o) => o.id === id);
      if (!ofc) return { ok: false, error: "Oficina não encontrada." };
      if (!canDeleteOficina(currentUser.role, ofc, currentUser.id)) {
        return { ok: false, error: "Você só pode excluir oficinas que criou." };
      }
      const ativos = (state.inscricoesOficina ?? []).filter(
        (i) => i.oficina_id === id && i.status !== "Cancelada",
      );
      if (ativos.length > 0) {
        return {
          ok: false,
          error: "Há inscritos. Prefira Encerrar ou Cancelar a oficina.",
        };
      }
      commit((prev) => ({
        ...prev,
        oficinas: (prev.oficinas ?? []).filter((o) => o.id !== id),
        inscricoesOficina: (prev.inscricoesOficina ?? []).filter(
          (i) => i.oficina_id !== id,
        ),
      }));
      return { ok: true };
    },
    [commit, currentUser, state.oficinas, state.inscricoesOficina],
  );

  const inscreverOficina: AppStore["inscreverOficina"] = useCallback(
    (input) => {
      const nome = input.nome_completo.trim();
      const email = input.email.trim().toLowerCase();
      const telefone = input.telefone.trim();
      if (!nome) return { ok: false, error: "Informe o nome completo." };
      if (!isValidEmail(email)) return { ok: false, error: "E-mail inválido." };
      if (!isValidPhone(telefone)) {
        return { ok: false, error: "Telefone/WhatsApp inválido." };
      }
      if (!input.aceite_termos) {
        return { ok: false, error: "É preciso aceitar as orientações da casa." };
      }

      let result:
        | { ok: true; inscricao: InscricaoOficina; waitlist: boolean }
        | { ok: false; error: string } = { ok: false, error: "Falha." };

      commit((prev) => {
        const oficina = (prev.oficinas ?? []).find((o) => o.id === input.oficina_id);
        if (!oficina) {
          result = { ok: false, error: "Oficina não encontrada." };
          return prev;
        }
        if (oficina.status === "Rascunho" || oficina.status === "Cancelada") {
          result = { ok: false, error: "Esta oficina não está aberta." };
          return prev;
        }
        if (oficina.status === "Encerrada") {
          result = { ok: false, error: "Inscrições encerradas." };
          return prev;
        }
        if (oficina.data_limite_inscricao) {
          const lim = new Date(`${oficina.data_limite_inscricao}T23:59:59`);
          if (new Date() > lim) {
            result = { ok: false, error: "Prazo de inscrição encerrado." };
            return prev;
          }
        }

        const userId = prev.currentUserId;
        const dup = findActiveInscricao(prev.inscricoesOficina ?? [], oficina.id, {
          usuarioId: userId,
          email,
        });
        if (dup) {
          result = { ok: false, error: "Você já possui inscrição nesta oficina." };
          return prev;
        }

        const ocupadas = countOccupied(prev.inscricoesOficina ?? [], oficina.id);
        const rest = vagasRestantes(oficina, ocupadas);
        const emBreve = oficina.status === "Em breve";
        const wantsWait =
          input.force_waitlist ||
          emBreve ||
          (rest !== null && rest <= 0);

        if (wantsWait) {
          if (emBreve || oficina.permitir_lista_espera) {
            // ok — lista de espera / avise-me
          } else {
            result = { ok: false, error: "Vagas esgotadas." };
            return prev;
          }
        }

        const now = nowIso();
        const waitlist = wantsWait;
        const inscricao: InscricaoOficina = {
          id: uid("oins"),
          oficina_id: oficina.id,
          usuario_id: userId ?? undefined,
          nome_completo: nome,
          telefone,
          email,
          data_nascimento: input.data_nascimento || undefined,
          e_filho_da_casa: input.e_filho_da_casa,
          ja_participou_antes: input.ja_participou_antes,
          necessidade_especial_ou_acessibilidade:
            input.necessidade_especial_ou_acessibilidade?.trim() || undefined,
          observacoes: input.observacoes?.trim() || undefined,
          aceite_termos: true,
          status: waitlist ? "Lista de espera" : "Confirmada",
          criado_em: now,
          atualizado_em: now,
        };

        let notifications = prev.notifications ?? [];
        const newOccupied = waitlist ? ocupadas : ocupadas + 1;
        if (
          !waitlist &&
          oficina.total_vagas > 0 &&
          newOccupied >= oficina.total_vagas
        ) {
          const staffNote: AppNotification = {
            id: uid("ntf"),
            title: "Oficina lotada",
            body: `${oficina.titulo} esgotou as vagas.`,
            type: "oficina_lotada",
            audience: ["pai_de_santo", "administrador"],
            related_id: oficina.id,
            href: `/oficinas/${oficina.id}/inscritos`,
            read: false,
            created_at: now,
          };
          notifications = [staffNote, ...notifications];
        }

        result = { ok: true, inscricao, waitlist };
        return {
          ...prev,
          inscricoesOficina: [inscricao, ...(prev.inscricoesOficina ?? [])],
          notifications,
        };
      });

      return result;
    },
    [commit],
  );

  const cancelarInscricaoOficina: AppStore["cancelarInscricaoOficina"] = useCallback(
    (inscricaoId) => {
      let error: string | undefined;
      commit((prev) => {
        const list = prev.inscricoesOficina ?? [];
        const target = list.find((i) => i.id === inscricaoId);
        if (!target || target.status === "Cancelada") {
          error = "Inscrição não encontrada.";
          return prev;
        }
        const now = nowIso();
        let next = list.map((i) =>
          i.id === inscricaoId
            ? { ...i, status: "Cancelada" as const, atualizado_em: now }
            : i,
        );

        let notifications = prev.notifications ?? [];
        if (target.status === "Confirmada" || target.status === "Presente") {
          const waiting = next
            .filter(
              (i) =>
                i.oficina_id === target.oficina_id &&
                i.status === "Lista de espera",
            )
            .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
          const promote = waiting[0];
          if (promote) {
            next = next.map((i) =>
              i.id === promote.id
                ? { ...i, status: "Confirmada" as const, atualizado_em: now }
                : i,
            );
            const ofc = (prev.oficinas ?? []).find((o) => o.id === target.oficina_id);
            const note: AppNotification = {
              id: uid("ntf"),
              title: "Vaga liberada",
              body: `Sua inscrição em ${ofc?.titulo ?? "oficina"} saiu da lista de espera.`,
              type: "oficina_espera_promovida",
              user_id: promote.usuario_id,
              related_id: promote.oficina_id,
              href: `/oficinas/${promote.oficina_id}`,
              read: false,
              created_at: now,
            };
            notifications = [note, ...notifications];
          }
        }

        return { ...prev, inscricoesOficina: next, notifications };
      });
      if (error) return { ok: false, error };
      return { ok: true };
    },
    [commit],
  );

  const atualizarStatusInscricaoOficina: AppStore["atualizarStatusInscricaoOficina"] =
    useCallback(
      (inscricaoId, status) => {
        if (!currentUser || !roleCanManageOficinas(currentUser.role)) {
          return { ok: false, error: "Sem permissão." };
        }
        let error: string | undefined;
        commit((prev) => {
          const list = prev.inscricoesOficina ?? [];
          const target = list.find((i) => i.id === inscricaoId);
          if (!target) {
            error = "Inscrição não encontrada.";
            return prev;
          }
          if (status === "Confirmada" || status === "Presente") {
            const ofc = (prev.oficinas ?? []).find((o) => o.id === target.oficina_id);
            if (ofc) {
              const ocupadas = countOccupied(list, ofc.id);
              const already =
                target.status === "Confirmada" || target.status === "Presente";
              const rest = vagasRestantes(ofc, already ? ocupadas - 1 : ocupadas);
              if (rest !== null && rest <= 0 && !already) {
                error = "Sem vagas para confirmar.";
                return prev;
              }
            }
          }
          return {
            ...prev,
            inscricoesOficina: list.map((i) =>
              i.id === inscricaoId
                ? { ...i, status, atualizado_em: nowIso() }
                : i,
            ),
          };
        });
        if (error) return { ok: false, error };
        return { ok: true };
      },
      [commit, currentUser],
    );

  const adicionarInscricaoManualOficina: AppStore["adicionarInscricaoManualOficina"] =
    useCallback(
      (input) => {
        if (!currentUser || !roleCanManageOficinas(currentUser.role)) {
          return { ok: false, error: "Sem permissão." };
        }
        return inscreverOficina({
          oficina_id: input.oficina_id,
          nome_completo: input.nome_completo,
          telefone: input.telefone,
          email: input.email,
          e_filho_da_casa: input.e_filho_da_casa ?? "Frequentador",
          ja_participou_antes: false,
          aceite_termos: true,
          force_waitlist: input.status === "Lista de espera",
        });
      },
      [currentUser, inscreverOficina],
    );

  const runOficinaReminders: AppStore["runOficinaReminders"] = useCallback(() => {
    const tomorrow = tomorrowIsoDate();
    commit((prev) => {
      const oficinas = (prev.oficinas ?? []).filter(
        (o) => o.data === tomorrow && o.status === "Publicada",
      );
      if (oficinas.length === 0) return prev;
      let notifications = prev.notifications ?? [];
      const stamp = nowIso().slice(0, 10);
      for (const ofc of oficinas) {
        const already = notifications.some(
          (n) =>
            n.type === "oficina_lembrete" &&
            n.related_id === ofc.id &&
            n.created_at.startsWith(stamp),
        );
        if (already) continue;
        const inscritos = (prev.inscricoesOficina ?? []).filter(
          (i) =>
            i.oficina_id === ofc.id &&
            (i.status === "Confirmada" || i.status === "Presente"),
        );
        for (const i of inscritos) {
          notifications = [
            {
              id: uid("ntf"),
              title: "Lembrete de oficina",
              body: `${ofc.titulo} é amanhã${ofc.hora_inicio ? ` às ${ofc.hora_inicio}` : ""}.`,
              type: "oficina_lembrete",
              user_id: i.usuario_id,
              related_id: ofc.id,
              href: `/oficinas/${ofc.id}`,
              read: false,
              created_at: nowIso(),
            },
            ...notifications,
          ];
        }
      }
      return { ...prev, notifications };
    });
  }, [commit]);

  useEffect(() => {
    if (!ready) return;
    runOficinaReminders();
  }, [ready, runOficinaReminders]);

  const value: AppStore = {
    ready,
    state,
    currentUser,
    loginDemo,
    hydrateAuthProfile,
    updateProfile,
    updateHouseSettings,
    requestShopPurchase,
    requestShopPurchaseGuest,
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
    claimUnassignedClient,
    removeClient,
    saveClientRegistration,
    createAppointment,
    bookGuestAppointment,
    holdGuestJogo,
    completeGuestJogoFicha,
    attachGuestJogoProof,
    paiDecideJogo,
    resolveJogoAccess,
    refreshJogoDeadlines,
    syncRemoteJogos,
    ensureGuestChatClient,
    sendGuestMessage,
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
    requestAjodunAccess,
    decideAjodunMembership,
    upsertPhotoAlbum,
    removePhotoAlbum,
    upsertShopProduct,
    removeShopProduct,
    upsertOficina,
    duplicateOficina,
    encerrarOficina,
    removeOficina,
    inscreverOficina,
    cancelarInscricaoOficina,
    atualizarStatusInscricaoOficina,
    adicionarInscricaoManualOficina,
    runOficinaReminders,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore deve ser usado dentro de AppStoreProvider");
  return ctx;
}
