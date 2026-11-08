import type {
  Certificate,
  CertificateSettings,
  Workshop,
  WorkshopModality,
  WorkshopRegistration,
  WorkshopRegistrationStatus,
  WorkshopStatus,
} from "@/types";

export const WORKSHOPS_STORAGE_KEY = "ile-oloroke-oficinas-v1";

export const MODALITY_LABEL: Record<WorkshopModality, string> = {
  presencial: "Presencial",
  online: "Online",
};

export const WORKSHOP_STATUS_LABEL: Record<WorkshopStatus, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  em_breve: "Em breve",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export const REGISTRATION_STATUS_LABEL: Record<WorkshopRegistrationStatus, string> = {
  confirmada: "Confirmada",
  lista_espera: "Lista de espera",
  cancelada: "Cancelada",
  presente: "Presente",
};

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  signer_name: "Vitor Cardozo · Ògún Yande",
  signer_title: "Babalorixá · Pai de Santo",
  second_signer_label: "Coordenação de Ensino",
  auto_release_on_close: false,
  pai_can_delete_any: true,
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function parseYmd(ymd?: string) {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/** "12 de novembro de 2026" */
export function formatLongDate(ymd?: string) {
  const p = parseYmd(ymd);
  if (!p) return "";
  return `${p.d} de ${MONTHS[p.mo - 1]} de ${p.y}`;
}

/** { day: "12", month: "NOV" } — selo de data do card */
export function dateBadge(ymd?: string) {
  const p = parseYmd(ymd);
  if (!p) return null;
  return { day: String(p.d).padStart(2, "0"), month: MONTHS_SHORT[p.mo - 1] };
}

/** "Quarta, 12 de novembro de 2026" */
export function formatWeekdayDate(ymd?: string) {
  const p = parseYmd(ymd);
  if (!p) return "";
  const dt = new Date(p.y, p.mo - 1, p.d);
  const wd = dt.toLocaleDateString("pt-BR", { weekday: "long" });
  const cap = wd.charAt(0).toUpperCase() + wd.slice(1).replace("-feira", "");
  return `${cap}, ${formatLongDate(ymd)}`;
}

export function formatTimeRange(w: Pick<Workshop, "start_time" | "end_time">) {
  const a = (w.start_time ?? "").replace(":", "h");
  const b = (w.end_time ?? "").replace(":", "h");
  if (a && b) return `${a} às ${b}`;
  return a || b || "";
}

export function formatPrice(price: number) {
  if (!price) return "Gratuita";
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}

export function todayYmd() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type SpotInfo = {
  confirmed: number;
  waitlist: number;
  total: number;
  /** null quando sem limite */
  left: number | null;
  full: boolean;
};

export function countSpots(
  workshop: Workshop,
  registrations: WorkshopRegistration[],
  remoteCounts?: Record<string, { confirmed: number; waitlist: number }>,
): SpotInfo {
  let confirmed = 0;
  let waitlist = 0;
  const remote = remoteCounts?.[workshop.id];
  if (remote) {
    confirmed = remote.confirmed;
    waitlist = remote.waitlist;
  } else {
    for (const r of registrations) {
      if (r.workshop_id !== workshop.id) continue;
      if (r.status === "confirmada" || r.status === "presente") confirmed += 1;
      else if (r.status === "lista_espera") waitlist += 1;
    }
  }
  const total = workshop.total_spots || 0;
  const left = total > 0 ? Math.max(0, total - confirmed) : null;
  return { confirmed, waitlist, total, left, full: left === 0 };
}

export type PublicState =
  | "aberta"
  | "ultimas"
  | "esgotada"
  | "espera"
  | "em_breve"
  | "encerrada"
  | "cancelada"
  | "prazo";

export function publicState(workshop: Workshop, spots: SpotInfo): PublicState {
  if (workshop.status === "cancelada") return "cancelada";
  if (workshop.status === "encerrada") return "encerrada";
  if (workshop.status === "em_breve" || !workshop.date) return "em_breve";
  if (workshop.date < todayYmd()) return "encerrada";
  if (workshop.registration_deadline && workshop.registration_deadline < todayYmd()) {
    return "prazo";
  }
  if (spots.full) return workshop.allow_waitlist ? "espera" : "esgotada";
  if (spots.left !== null && spots.total > 0 && spots.left <= Math.max(3, Math.ceil(spots.total * 0.2))) {
    return "ultimas";
  }
  return "aberta";
}

export function spotsLabel(workshop: Workshop, spots: SpotInfo) {
  const st = publicState(workshop, spots);
  if (st === "em_breve") return "Inscrições em breve";
  if (st === "encerrada") return "Oficina encerrada";
  if (st === "cancelada") return "Oficina cancelada";
  if (st === "prazo") return "Inscrições encerradas";
  if (st === "esgotada") return "Vagas esgotadas";
  if (st === "espera") return "Vagas esgotadas · lista de espera";
  if (spots.left === null) return "Inscrições abertas";
  if (spots.left === 1) return "Última vaga";
  return `${spots.left} vagas restantes`;
}

export function canRegister(workshop: Workshop, spots: SpotInfo) {
  const st = publicState(workshop, spots);
  return st === "aberta" || st === "ultimas" || st === "espera";
}

/** OLT-AAAA-000000 */
export function makeCertificateCode(existing: Certificate[], year = new Date().getFullYear()) {
  const used = new Set(existing.map((c) => c.code));
  for (let i = 0; i < 50; i += 1) {
    const n = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0");
    const code = `OLT-${year}-${n}`;
    if (!used.has(code)) return code;
  }
  return `OLT-${year}-${Date.now().toString().slice(-6)}`;
}

export function certificateUrl(code: string) {
  const origin =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "https://olomitutu.vercel.app");
  return `${origin}/certificado/${encodeURIComponent(code)}`;
}

export function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

export function whatsappLink(phone: string, text?: string) {
  let d = onlyDigits(phone);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${d}${q}`;
}

export function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function registrationsToCsv(workshop: Workshop, regs: WorkshopRegistration[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = [
    "Nome",
    "WhatsApp",
    "E-mail",
    "Nascimento",
    "Vínculo com a casa",
    "Já participou",
    "Acessibilidade",
    "Observações",
    "Status",
    "Inscrito em",
  ];
  const vinculo = { sim: "Sim", nao: "Não", frequentador: "Frequentador" } as const;
  const lines = regs.map((r) =>
    [
      r.full_name,
      r.phone,
      r.email,
      r.birth_date ?? "",
      vinculo[r.house_link],
      r.attended_before ? "Sim" : "Não",
      r.accessibility_needs ?? "",
      r.notes ?? "",
      REGISTRATION_STATUS_LABEL[r.status],
      new Date(r.created_at).toLocaleString("pt-BR"),
    ]
      .map(esc)
      .join(";"),
  );
  return `\uFEFF${esc(workshop.title)}\n${head.map(esc).join(";")}\n${lines.join("\n")}`;
}

function seedDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Oficinas de exemplo (modo demonstração). */
export function seedWorkshops(): Workshop[] {
  const stamp = new Date().toISOString();
  const base = {
    allow_waitlist: true,
    issues_certificate: true,
    created_by_name: "Vitor Cardozo · Ògún Yande",
    created_at: stamp,
    updated_at: stamp,
  };
  return [
    {
      ...base,
      id: "wks-ervas",
      title: "Ervas e Banhos Sagrados",
      short_description: "Aprenda sobre o uso das ervas e banhos para limpeza e equilíbrio espiritual.",
      about:
        "Uma tarde de vivência sobre as folhas sagradas: como reconhecer, colher, preparar e usar as ervas nos banhos de limpeza e de equilíbrio, sempre com respeito ao àṣẹ e à tradição da casa.",
      topics: [
        "Origem e fundamentos das ervas",
        "Principais ervas e suas funções",
        "Como preparar banhos de limpeza",
        "Cuidados e orientações espirituais",
      ],
      modality: "presencial",
      status: "publicada",
      date: seedDate(5),
      start_time: "19:00",
      end_time: "22:00",
      location: "Ilé Olóròkè Àṣẹ",
      total_spots: 30,
      price: 0,
      workload: "3 horas",
    },
    {
      ...base,
      id: "wks-orixas",
      title: "Fundamentos dos Orixás",
      short_description: "Conheça a história, características e fundamentos dos Orixás.",
      about:
        "Encontro online para conhecer a história, os arquétipos e os fundamentos de cada Orixá, com espaço para perguntas ao final.",
      topics: ["História e origem", "Características e arquétipos", "Cores, dias e saudações"],
      modality: "online",
      status: "publicada",
      date: seedDate(14),
      start_time: "20:00",
      end_time: "22:00",
      total_spots: 20,
      price: 0,
      workload: "2 horas",
    },
    {
      ...base,
      id: "wks-guias",
      title: "Confecção de Guias",
      short_description: "Aprenda a confeccionar guias e fios de contas com seus significados.",
      about: "Oficina prática de confecção de guias e fios de contas, com explicação do significado de cada cor.",
      topics: ["Materiais e preparo", "Cores e significados", "Montagem passo a passo"],
      modality: "presencial",
      status: "publicada",
      date: seedDate(21),
      start_time: "14:00",
      end_time: "18:00",
      location: "Ilé Olóròkè Àṣẹ",
      total_spots: 15,
      price: 0,
      workload: "4 horas",
    },
    {
      ...base,
      id: "wks-espiritualidade",
      title: "Espiritualidade e Autoconhecimento",
      short_description: "Um encontro para reflexão, conexão e fortalecimento espiritual.",
      about: "Roda de conversa e vivência sobre espiritualidade, autocuidado e autoconhecimento.",
      topics: ["Roda de conversa", "Práticas de autocuidado", "Meditação guiada"],
      modality: "presencial",
      status: "em_breve",
      location: "Ilé Olóròkè Àṣẹ",
      total_spots: 25,
      price: 0,
      workload: "3 horas",
    },
  ];
}

export function seedRegistrations(): WorkshopRegistration[] {
  const stamp = new Date().toISOString();
  const names = [
    "Ana Souza",
    "Bruno Lima",
    "Carla Mendes",
    "Diego Rocha",
    "Elaine Castro",
    "Fábio Nunes",
    "Gabriela Dias",
    "Heitor Alves",
  ];
  const regs: WorkshopRegistration[] = [];
  // Ervas: 22 inscritos (8 vagas restantes)
  for (let i = 0; i < 22; i += 1) {
    const n = names[i % names.length];
    regs.push({
      id: `wkr-ervas-${i}`,
      workshop_id: "wks-ervas",
      full_name: i < names.length ? n : `${n} ${i}`,
      phone: `(21) 9${String(80000000 + i * 1371).slice(0, 8)}`,
      email: `pessoa${i}@exemplo.com`,
      house_link: i % 3 === 0 ? "sim" : i % 3 === 1 ? "frequentador" : "nao",
      attended_before: i % 2 === 0,
      accepted_terms: true,
      status: "confirmada",
      created_at: stamp,
      updated_at: stamp,
    });
  }
  // Orixás: 15 inscritos (5 vagas)
  for (let i = 0; i < 15; i += 1) {
    regs.push({
      id: `wkr-orixas-${i}`,
      workshop_id: "wks-orixas",
      full_name: `${names[i % names.length]} ${i + 1}`,
      phone: `(21) 9${String(70000000 + i * 997).slice(0, 8)}`,
      email: `online${i}@exemplo.com`,
      house_link: "nao",
      attended_before: false,
      accepted_terms: true,
      status: "confirmada",
      created_at: stamp,
      updated_at: stamp,
    });
  }
  // Guias: 15/15 — esgotada
  for (let i = 0; i < 15; i += 1) {
    regs.push({
      id: `wkr-guias-${i}`,
      workshop_id: "wks-guias",
      full_name: `${names[(i + 3) % names.length]} ${i + 1}`,
      phone: `(21) 9${String(60000000 + i * 811).slice(0, 8)}`,
      email: `guias${i}@exemplo.com`,
      house_link: "frequentador",
      attended_before: true,
      accepted_terms: true,
      status: "confirmada",
      created_at: stamp,
      updated_at: stamp,
    });
  }
  return regs;
}
