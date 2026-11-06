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

export type MessageKind = "text" | "audio";

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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  photoAlbums: PhotoAlbum[];
}
