import type {
  InscricaoOficina,
  InscricaoOficinaStatus,
  Oficina,
  OficinaModalidade,
  OficinaStatus,
  Profile,
  UserRole,
} from "@/types";

/** Se true, Pai pode excluir qualquer oficina; se false, só as que criou. */
export const PAI_CAN_DELETE_ALL_OFICINAS = false;

const OCCUPYING: InscricaoOficinaStatus[] = ["Confirmada", "Presente"];

export function isOccupyingStatus(status: InscricaoOficinaStatus) {
  return OCCUPYING.includes(status);
}

export function countOccupied(
  inscricoes: InscricaoOficina[],
  oficinaId: string,
) {
  return inscricoes.filter(
    (i) => i.oficina_id === oficinaId && isOccupyingStatus(i.status),
  ).length;
}

export function countWaitlist(
  inscricoes: InscricaoOficina[],
  oficinaId: string,
) {
  return inscricoes.filter(
    (i) => i.oficina_id === oficinaId && i.status === "Lista de espera",
  ).length;
}

/** null = ilimitado */
export function vagasRestantes(oficina: Oficina, ocupadas: number): number | null {
  if (oficina.total_vagas <= 0) return null;
  return Math.max(0, oficina.total_vagas - ocupadas);
}

export function vagasLabel(oficina: Oficina, ocupadas: number): {
  text: string;
  tone: "ok" | "warn" | "full" | "unlimited";
} {
  if (oficina.total_vagas <= 0) {
    return { text: "Vagas ilimitadas", tone: "unlimited" };
  }
  const rest = vagasRestantes(oficina, ocupadas) ?? 0;
  if (rest <= 0) return { text: "Esgotada", tone: "full" };
  const ratio = rest / oficina.total_vagas;
  if (ratio <= 0.2) {
    return {
      text: rest === 1 ? "Última 1 vaga" : `Últimas ${rest} vagas`,
      tone: "warn",
    };
  }
  return { text: `${rest} vagas disponíveis`, tone: "ok" };
}

export function isPublicListStatus(status: OficinaStatus) {
  return status === "Publicada" || status === "Em breve";
}

export function sortOficinasProximas(a: Oficina, b: Oficina) {
  const ad = a.data || "9999-12-31";
  const bd = b.data || "9999-12-31";
  if (ad !== bd) return ad.localeCompare(bd);
  return (a.hora_inicio || "").localeCompare(b.hora_inicio || "");
}

export type OficinaFilterChip = "todos" | "presencial" | "online" | "em_breve";

export function filterOficinasPublic(
  list: Oficina[],
  chip: OficinaFilterChip,
): Oficina[] {
  return list
    .filter((o) => isPublicListStatus(o.status))
    .filter((o) => {
      if (chip === "todos") return true;
      if (chip === "presencial") return o.modalidade === "Presencial";
      if (chip === "online") return o.modalidade === "Online";
      return o.status === "Em breve";
    })
    .slice()
    .sort(sortOficinasProximas);
}

/** Ex.: 12 de nov. de 2026 */
export function formatOficinaDate(isoDate?: string | null) {
  if (!isoDate) return "A definir";
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "A definir";
  const raw = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  return raw.replace(/\./g, "").replace(/\sde\s/g, " de ");
}

export function formatOficinaHorario(inicio?: string, fim?: string) {
  if (!inicio && !fim) return "Horário a definir";
  if (inicio && fim) return `${inicio}–${fim}`;
  return inicio || fim || "Horário a definir";
}

export function inscricoesEncerradas(oficina: Oficina, now = new Date()) {
  if (
    oficina.status === "Encerrada" ||
    oficina.status === "Cancelada" ||
    oficina.status === "Rascunho"
  ) {
    return true;
  }
  if (oficina.data_limite_inscricao) {
    const lim = new Date(`${oficina.data_limite_inscricao}T23:59:59`);
    if (now > lim) return true;
  }
  return false;
}

export type InscricaoCta =
  | { kind: "inscrever"; label: string }
  | { kind: "espera"; label: string }
  | { kind: "avisar"; label: string }
  | { kind: "inscrito"; label: string; inscricaoId: string }
  | { kind: "disabled"; label: string };

export function resolveInscricaoCta(opts: {
  oficina: Oficina;
  ocupadas: number;
  minha?: InscricaoOficina | null;
}): InscricaoCta {
  const { oficina, ocupadas, minha } = opts;
  if (minha && (minha.status === "Confirmada" || minha.status === "Presente" || minha.status === "Lista de espera")) {
    return {
      kind: "inscrito",
      label:
        minha.status === "Lista de espera"
          ? "Você está na lista de espera"
          : "Você está inscrito(a)",
      inscricaoId: minha.id,
    };
  }
  if (oficina.status === "Em breve") {
    return { kind: "avisar", label: "Avise-me quando abrir" };
  }
  if (inscricoesEncerradas(oficina)) {
    return { kind: "disabled", label: "Inscrições encerradas" };
  }
  const rest = vagasRestantes(oficina, ocupadas);
  if (rest === null || rest > 0) {
    return { kind: "inscrever", label: "Quero me inscrever" };
  }
  if (oficina.permitir_lista_espera) {
    return { kind: "espera", label: "Entrar na lista de espera" };
  }
  return { kind: "disabled", label: "Inscrições encerradas" };
}

export function findActiveInscricao(
  inscricoes: InscricaoOficina[],
  oficinaId: string,
  opts: { usuarioId?: string | null; email?: string | null },
) {
  const email = opts.email?.trim().toLowerCase();
  return (
    inscricoes.find((i) => {
      if (i.oficina_id !== oficinaId) return false;
      if (i.status === "Cancelada") return false;
      if (opts.usuarioId && i.usuario_id === opts.usuarioId) return true;
      if (email && i.email.trim().toLowerCase() === email) return true;
      return false;
    }) ?? null
  );
}

export function canManageOficinas(role: UserRole | null | undefined) {
  return role === "pai_de_santo" || role === "administrador";
}

export function canDeleteOficina(
  role: UserRole | null | undefined,
  oficina: Oficina,
  userId?: string | null,
) {
  if (role === "administrador") return true;
  if (role !== "pai_de_santo") return false;
  if (PAI_CAN_DELETE_ALL_OFICINAS) return true;
  return !!userId && oficina.criado_por === userId;
}

export function modalidadeBadgeClass(m: OficinaModalidade | "Em breve") {
  if (m === "Online") return "bg-[#d6e4f5] text-[#0D2A5C]";
  if (m === "Em breve") return "bg-[#d8eee0] text-[#1f7a3a]";
  return "bg-[#efe6d0] text-[#0D2A5C]";
}

export function statusBadgeClass(status: OficinaStatus) {
  if (status === "Publicada") return "bg-[#d8eee0] text-[#1f7a3a]";
  if (status === "Em breve") return "bg-[#d8eee0] text-[#1f7a3a]";
  if (status === "Rascunho") return "bg-navy/10 text-navy/70";
  if (status === "Cancelada") return "bg-danger/10 text-danger";
  return "bg-mist text-navy/65";
}

export function buildOficinaIcs(oficina: Oficina) {
  const title = oficina.titulo.replace(/,/g, " ");
  const desc = (oficina.descricao_curta || "").replace(/\n/g, " ");
  const loc =
    oficina.modalidade === "Online"
      ? "Online"
      : oficina.local || "A definir";
  if (!oficina.data || !oficina.hora_inicio) {
    return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\nDESCRIPTION:${desc}\nLOCATION:${loc}\nEND:VEVENT\nEND:VCALENDAR`;
  }
  const [y, m, d] = oficina.data.split("-").map(Number);
  const [hh, mm] = oficina.hora_inicio.split(":").map(Number);
  const [eh, em] = (oficina.hora_fim || oficina.hora_inicio).split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  const end = `${y}${pad(m)}${pad(d)}T${pad(eh)}${pad(em)}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Olomi Tutu//Oficinas//PT",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${loc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadOficinaIcs(oficina: Oficina) {
  const blob = new Blob([buildOficinaIcs(oficina)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${oficina.titulo.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 11;
}

export function whatsappHref(phone: string) {
  const d = phone.replace(/\D/g, "");
  const withCountry = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${withCountry}`;
}

export function profilePrefill(user: Profile | null) {
  if (!user) {
    return { nome_completo: "", email: "", telefone: "" };
  }
  return {
    nome_completo: user.full_name || "",
    email: user.email || "",
    telefone: maskPhone(user.phone || ""),
  };
}

export function tomorrowIsoDate(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function inscricoesToCsv(rows: InscricaoOficina[]) {
  const header = [
    "nome_completo",
    "telefone",
    "email",
    "status",
    "e_filho_da_casa",
    "ja_participou_antes",
    "criado_em",
  ];
  const lines = [header.join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.nome_completo,
        r.telefone,
        r.email,
        r.status,
        r.e_filho_da_casa,
        r.ja_participou_antes ? "sim" : "nao",
        r.criado_em,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(";"),
    );
  }
  return lines.join("\n");
}
