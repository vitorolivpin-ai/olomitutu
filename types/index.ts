export type UserRole =
  | "administrador"
  | "tesouraria"
  | "pai_de_santo"
  | "estoque"
  | "biblioteca"
  | "cliente";

export type MemberStatus = "ativo" | "afastado" | "isento" | "inativo";

export type FeeStatus = "PAGO" | "AGUARDANDO" | "VENCIDO" | "ISENTO" | "CANCELADO";

export type ExpenseStatus = "PAGA" | "EM_ABERTO" | "VENCIDA";

export type ExpenseCategory =
  | "luz"
  | "agua"
  | "internet"
  | "aluguel"
  | "manutencao"
  | "materiais"
  | "outras";

export type AppointmentStatus =
  | "SOLICITADO"
  | "CONFIRMADO"
  | "EM_ATENDIMENTO"
  | "REALIZADO"
  | "CANCELADO"
  | "NAO_COMPARECEU";

export type PaymentMethod = "PIX" | "BOLETO" | "DINHEIRO" | "TRANSFERENCIA" | "OUTRO";

export type LibraryKind = "video" | "cantiga" | "pdf" | "outro";

export type BlogPostCategory = "historia_casa" | "historia_pai" | "pessoa" | "outro";

export type EducationKind = "livro" | "video" | "filme" | "podcast";

export type HouseOffice =
  | "pai_de_santo"
  | "mae_pequena"
  | "ogan"
  | "ekeji"
  | "oloye"
  | "ajoye"
  | "egbomi"
  | "iniciado"
  | "abian"
  | "outro";

export type ChecklistLevel = "abian" | "iniciado" | "egbomi" | "ogan_ekeji_oloye_ajoye";

export type ChecklistTopic = "vestimentas" | "ebo" | "igba" | "geral" | "outro";

export type StockMovementType = "entrada" | "saida";

export type MessageKind = "text" | "audio" | "video" | "call";

export type ApprovalStatus = "pending" | "approved" | "rejected";

/** Como a pessoa se identifica no cadastro das abas da casa. */
export type PersonKind = "filho_de_santo" | "cliente" | "administrador";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  client_id?: string;
  avatar_url?: string;
  /** Área pedida no cadastro (pode diferir de role até aprovação). */
  requested_role?: UserRole;
  approval_status?: ApprovalStatus;
  person_kind?: PersonKind;
  /** Aba onde a pessoa se cadastrou (adm, estoque, financeiro…). */
  signup_area?: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  monthly_fee_amount: number;
  due_day: number;
  entry_date: string;
  status: MemberStatus;
  admin_notes?: string;
  /** Perfil logado (filho de santo) vinculado a este membro financeiro. */
  profile_id?: string;
  /** Nível para checklist / hierarquia do filho. */
  checklist_level?: ChecklistLevel;
  created_at: string;
  updated_at: string;
}

/** Comprovante de mensalidade (recibo no app + e-mail). */
export interface FeeReceipt {
  id: string;
  monthly_fee_id: string;
  member_id: string;
  profile_id?: string;
  number: string;
  payer_name: string;
  payer_email?: string;
  competence: string;
  amount: number;
  payment_method: PaymentMethod;
  paid_at: string;
  email_sent: boolean;
  email_error?: string;
  created_at: string;
}

export type AjodunMembershipStatus = "requested" | "approved" | "rejected";

/** Pedido do filho para participar de um ajodun (Admin libera a planilha). */
export interface AjodunMembership {
  id: string;
  user_id: string;
  ajodun_event_id: string;
  status: AjodunMembershipStatus;
  created_at: string;
  updated_at: string;
  decided_by?: string;
}

export interface MonthlyFee {
  id: string;
  member_id: string;
  competence: string;
  amount: number;
  due_date: string;
  status: FeeStatus;
  paid_at?: string;
  payment_method?: PaymentMethod;
  amount_received?: number;
  observation?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  monthly_fee_id: string;
  method: PaymentMethod;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  pix_copy_paste?: string;
  boleto_code?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  due_date: string;
  competence: string;
  status: ExpenseStatus;
  paid_at?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  registration_complete?: boolean;
  notes?: string;
  /** Marcação pública sem conta — ficha só o Pai vê. */
  is_guest?: boolean;
  created_at: string;
  updated_at: string;
}

/** Dados da ficha preenchida no agendamento aberto (sem login). */
export interface AppointmentGuestFicha {
  full_name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  observation?: string;
}

export interface Availability {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  break_minutes: number;
  is_blocked: boolean;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface PublishedSlot {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  started_at?: string;
  ended_at?: string;
  amount?: number;
  notes?: string;
  /** ID do evento no Google Calendar (sync App → Google). */
  google_event_id?: string;
  /** Código único da ficha (ex.: FC-A1B2C3D4). */
  ficha_code?: string;
  /** Preenchida na marcação pública — visível só para o Pai de Santo. */
  guest_ficha?: AppointmentGuestFicha;
  /** true = agendamento aberto; ficha restrita ao Pai. */
  pai_only_ficha?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  sender_id?: string;
  sender_role: UserRole;
  sender_name: string;
  recipient_role?: UserRole;
  body: string;
  kind?: MessageKind;
  audio_data_url?: string;
  audio_url?: string;
  audio_duration_sec?: number;
  /** Vídeo enviado no chat (data URL no demo / local). */
  video_data_url?: string;
  /** URL pública do vídeo (Storage). */
  video_url?: string;
  /** Link da sala de chamada de vídeo (Jitsi). */
  call_url?: string;
  appointment_id?: string;
  created_at: string;
}

export interface InternalNote {
  id: string;
  client_id: string;
  author_id?: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  audience?: UserRole[];
  user_id?: string;
  /** Ex.: client_id da conversa, para filtrar avisos do App do Cliente. */
  related_id?: string;
  read: boolean;
  href?: string;
  created_at: string;
}

export interface StockProduct {
  id: string;
  barcode: string;
  name: string;
  unit: string;
  category?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StockLot {
  id: string;
  product_id: string;
  barcode: string;
  quantity: number;
  expires_at: string;
  batch_code?: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  lot_id?: string;
  barcode: string;
  type: StockMovementType;
  quantity: number;
  expires_at?: string;
  performed_by: string;
  note?: string;
  created_at: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  description?: string;
  kind: LibraryKind;
  external_url?: string;
  file_url?: string;
  file_data_url?: string;
  file_name?: string;
  mime_type?: string;
  visible_to_clients: boolean;
  uploaded_by?: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt?: string;
  body: string;
  category: BlogPostCategory;
  author_name: string;
  cover_url?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface EducationItem {
  id: string;
  title: string;
  description?: string;
  kind: EducationKind;
  url?: string;
  author_or_source?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface HierarchyPerson {
  id: string;
  full_name: string;
  office: HouseOffice;
  office_label?: string;
  bio?: string;
  photo_url?: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  level: ChecklistLevel;
  topic: ChecklistTopic;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistProgress {
  id?: string;
  item_id: string;
  user_id?: string;
  done: boolean;
  updated_at: string;
}

export interface AjodunTask {
  id: string;
  label: string;
  done: boolean;
}

export interface AjodunEvent {
  id: string;
  title: string;
  theme?: string;
  scheduled_at?: string;
  notes?: string;
  sheet_url?: string;
  tasks: AjodunTask[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  caption?: string;
}

export interface PhotoAlbum {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  drive_url?: string;
  photos: PhotoItem[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppState {
  profiles: Profile[];
  currentUserId: string | null;
  members: Member[];
  monthlyFees: MonthlyFee[];
  payments: Payment[];
  expenses: Expense[];
  clients: Client[];
  appointments: Appointment[];
  messages: Message[];
  internalNotes: InternalNote[];
  notifications: AppNotification[];
  availability: Availability[];
  publishedSlots: PublishedSlot[];
  stockProducts: StockProduct[];
  stockLots: StockLot[];
  stockMovements: StockMovement[];
  libraryItems: LibraryItem[];
  blogPosts: BlogPost[];
  educationItems: EducationItem[];
  hierarchyPeople: HierarchyPerson[];
  checklistItems: ChecklistItem[];
  checklistProgress: ChecklistProgress[];
  ajodunEvents: AjodunEvent[];
  ajodunMemberships: AjodunMembership[];
  feeReceipts: FeeReceipt[];
  photoAlbums: PhotoAlbum[];
  shopProducts: ShopProduct[];
  shopPurchases: ShopPurchase[];
  houseSettings: HouseSettings;
  /**
   * @deprecated Preferir staffHiddenAt — mantido para migração local.
   */
  staffHiddenClientIds: string[];
  /**
   * Conversas ocultas na visão da casa (Pai/Admin).
   * clientId → ISO de quando foi ocultada. Mensagem posterior desarquiva.
   */
  staffHiddenAt: Record<string, string>;
}

export type ShopProductKind = "fisico" | "pdf" | "curso";

export type ShopPurchaseStatus = "solicitado" | "pago_liberado" | "recusado";

/** Pix e dados públicos da casa (chave única para a loja). */
export interface HouseSettings {
  pix_key?: string;
  pix_holder_name?: string;
  updated_at?: string;
}

/** Produto da loja (hub público + App do Cliente). */
export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  available: boolean;
  sort_order: number;
  /** físico = entrega; pdf/curso = digital (pode exigir pagamento). */
  kind: ShopProductKind;
  /** URL do PDF/curso após liberação. */
  file_url?: string;
  /** Se true, mostra cadeado até o Financeiro liberar a compra. */
  requires_payment: boolean;
  created_at: string;
  updated_at: string;
}

/** Ficha para nota fiscal / envio por e-mail (compra sem conta). */
export interface ShopInvoiceForm {
  full_name: string;
  email: string;
  cpf_cnpj: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/** Pedido de compra na loja (PDF/curso bloqueado ou físico). */
export interface ShopPurchase {
  id: string;
  product_id: string;
  /** Presente se o comprador tem conta de cliente. */
  client_id?: string;
  /** Conta = libera no app; email = envia após NF/ficha. */
  delivery: "conta" | "email";
  guest_email?: string;
  invoice?: ShopInvoiceForm;
  status: ShopPurchaseStatus;
  created_at: string;
  updated_at: string;
  released_by?: string;
}

/* ─── Oficinas (separadas da Loja) ─── */

export type WorkshopModality = "presencial" | "online";

export type WorkshopStatus =
  | "rascunho"
  | "publicada"
  | "em_breve"
  | "encerrada"
  | "cancelada";

export interface Workshop {
  id: string;
  title: string;
  /** Até 120 caracteres — aparece no card da lista. */
  short_description: string;
  /** Texto longo — “Sobre esta oficina”. */
  about?: string;
  /** Tópicos — “Conteúdo”. */
  topics: string[];
  /** URL pública ou data URL (demo). */
  image_url?: string;
  modality: WorkshopModality;
  status: WorkshopStatus;
  /** YYYY-MM-DD — vazio quando “Em breve”. */
  date?: string;
  /** HH:mm */
  start_time?: string;
  end_time?: string;
  location?: string;
  /** Link da sala (online) — só aparece para inscrito confirmado. */
  online_link?: string;
  /** 0 = sem limite */
  total_spots: number;
  allow_waitlist: boolean;
  /** YYYY-MM-DD */
  registration_deadline?: string;
  /** 0 = gratuita */
  price: number;
  /** Ex.: "3 horas" — usado no certificado. */
  workload?: string;
  issues_certificate: boolean;
  /** Quem assina o certificado desta oficina (vazio = padrão da casa). */
  certificate_signer_name?: string;
  created_by?: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export type WorkshopRegistrationStatus =
  | "confirmada"
  | "lista_espera"
  | "cancelada"
  | "presente";

export type WorkshopHouseLink = "sim" | "nao" | "frequentador";

export interface WorkshopRegistration {
  id: string;
  workshop_id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  email: string;
  birth_date?: string;
  house_link: WorkshopHouseLink;
  attended_before: boolean;
  accessibility_needs?: string;
  notes?: string;
  accepted_terms: boolean;
  status: WorkshopRegistrationStatus;
  /** Inscrição feita pela casa (presencialmente). */
  added_by_staff?: boolean;
  created_at: string;
  updated_at: string;
}

/* ─── Certificados ─── */

export type CertificateKind = "oficina" | "curso";

export type CertificateStatus = "disponivel" | "revogado";

export interface Certificate {
  id: string;
  /** OLT-AAAA-000000 */
  code: string;
  user_id?: string;
  /** Usado para achar o certificado quando a pessoa não tinha conta. */
  email?: string;
  kind: CertificateKind;
  /** id da oficina ou do produto (curso) */
  reference_id?: string;
  printed_name: string;
  title: string;
  /** YYYY-MM-DD */
  completed_on: string;
  modality: WorkshopModality;
  workload?: string;
  signer_name: string;
  signer_title: string;
  second_signer_label: string;
  /** Cópia da assinatura no momento da emissão (PNG transparente). */
  signature_data_url?: string;
  status: CertificateStatus;
  issued_at: string;
  issued_by_name?: string;
  revoked_at?: string;
  revoked_by_name?: string;
  /** Visto pelo dono (para o selo “Novo”). */
  seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CertificateSettings {
  signer_name: string;
  signer_title: string;
  second_signer_label: string;
  /** PNG transparente da assinatura do Pai de Santo. */
  signature_data_url?: string;
  /** Libera os certificados ao marcar a oficina como “Encerrada”. */
  auto_release_on_close: boolean;
  /** Pai de Santo pode excluir oficinas criadas por outras pessoas. */
  pai_can_delete_any: boolean;
  updated_at?: string;
  updated_by_name?: string;
}

export interface CertificateCorrectionRequest {
  id: string;
  certificate_id: string;
  requested_name: string;
  requested_by_name: string;
  status: "pendente" | "resolvida";
  created_at: string;
}
