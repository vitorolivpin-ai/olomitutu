import type { AppNotification, UserRole } from "@/types";

/** Destinatários padrão por tipo, quando a notificação não define `audience`. */
export function audienceFromType(
  type: AppNotification["type"],
  opts?: { clientFacing?: boolean },
): UserRole[] {
  if (opts?.clientFacing) return ["cliente"];

  switch (type) {
    case "chat":
      return ["pai_de_santo"];
    case "agenda":
      return ["pai_de_santo"];
    case "atendimento":
      return ["pai_de_santo"];
    case "financeiro":
      return ["tesouraria", "administrador"];
    case "estoque":
      return ["estoque", "administrador"];
    case "biblioteca":
      return opts?.clientFacing
        ? ["cliente"]
        : ["biblioteca", "pai_de_santo", "administrador"];
    case "sistema":
    default:
      return ["administrador"];
  }
}

export function notificationAudience(n: AppNotification): UserRole[] {
  if (n.audience && n.audience.length > 0) return n.audience;
  const clientFacing =
    n.href?.startsWith("/cliente") ||
    n.href?.startsWith("/filho") ||
    n.title.toLowerCase().includes("horário liberado") ||
    n.title.toLowerCase().includes("horário disponível") ||
    n.title.toLowerCase().includes("novo horário");
  return audienceFromType(n.type, { clientFacing });
}

export function canSeeNotification(
  n: AppNotification,
  role: UserRole | null | undefined,
) {
  if (!role) return false;
  return notificationAudience(n).includes(role);
}

export function notificationsForRole(
  list: AppNotification[],
  role: UserRole | null | undefined,
  opts?: { clientId?: string | null },
) {
  if (!role) return [];
  return list.filter((n) => {
    if (!canSeeNotification(n, role)) return false;
    // Cliente só vê chat da própria conversa
    if (role === "cliente" && n.type === "chat" && opts?.clientId) {
      if (n.related_id && n.related_id !== opts.clientId) return false;
    }
    return true;
  });
}

export function unreadCountForRole(
  list: AppNotification[],
  role: UserRole | null | undefined,
  opts?: { clientId?: string | null },
) {
  return notificationsForRole(list, role, opts).filter((n) => !n.read).length;
}

/** Badge de chat no menu — só conta o que ainda não foi aberto. */
export function unreadChatCountForRole(
  list: AppNotification[],
  role: UserRole | null | undefined,
  opts?: { clientId?: string | null },
) {
  if (!role) return 0;
  return list.filter((n) => {
    if (n.read || n.type !== "chat") return false;
    if (n.audience?.length && !n.audience.includes(role)) return false;
    if (role === "cliente") {
      if (opts?.clientId && n.related_id && n.related_id !== opts.clientId) {
        return false;
      }
    }
    return true;
  }).length;
}
