const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFmt = new Intl.DateTimeFormat("pt-BR");
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCurrency(value: number) {
  return currency.format(value);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  return dateTimeFmt.format(typeof value === "string" ? new Date(value) : value);
}

export function formatTime(value?: string | Date | null) {
  if (!value) return "—";
  return timeFmt.format(typeof value === "string" ? new Date(value) : value);
}

export function formatCompetence(competence: string) {
  const [year, month] = competence.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function currentCompetence(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h${String(minutes).padStart(2, "0")}min`;
}

export function signedCurrency(value: number) {
  const formatted = formatCurrency(Math.abs(value));
  if (value > 0) return `+ ${formatted}`;
  if (value < 0) return `- ${formatted}`;
  return formatted;
}
