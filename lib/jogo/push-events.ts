/**
 * Templates de Web Push do fluxo de Jogo — sem PII na lock screen.
 * Destinos: Pai (responsible_profile_id) ou visitante (jogo_id + token hash).
 * Admin e Financeiro nunca recebem.
 */

export const JOGO_PUSH_EVENTS = [
  "JOGO_COMPROVANTE_RECEBIDO",
  "JOGO_PRAZO_PROXIMO",
  "JOGO_PRAZO_ATINGIDO",
  "JOGO_CONFIRMADO",
  "JOGO_RECUSADO",
  "JOGO_NOVO_COMPROVANTE",
  "JOGO_LEMBRETE_1H",
  "JOGO_LEMBRETE_15MIN",
] as const;

export type JogoPushEvent = (typeof JOGO_PUSH_EVENTS)[number];

export type JogoPushAudience = "pai" | "visitante" | "ambos";

export type JogoPushTemplate = {
  event: JogoPushEvent;
  title: string;
  body: string;
  tag: string;
  audience: JogoPushAudience;
  /** Path relativo; access_token bruto só entra no URL de JOGO_CONFIRMADO no servidor. */
  urlFor: (ctx: { jogoId: string; accessToken?: string }) => string;
};

const TEMPLATES: Record<JogoPushEvent, JogoPushTemplate> = {
  JOGO_COMPROVANTE_RECEBIDO: {
    event: "JOGO_COMPROVANTE_RECEBIDO",
    title: "Comprovante recebido",
    body: "Há um Jogo aguardando sua análise. Abra o atendimento.",
    tag: "jogo-comprovante",
    audience: "pai",
    urlFor: ({ jogoId }) => `/atendimentos/${jogoId}`,
  },
  JOGO_PRAZO_PROXIMO: {
    event: "JOGO_PRAZO_PROXIMO",
    title: "Prazo de análise próximo",
    body: "Faltam cerca de 4 horas para o prazo de análise deste Jogo.",
    tag: "jogo-prazo-proximo",
    audience: "pai",
    urlFor: ({ jogoId }) => `/atendimentos/${jogoId}`,
  },
  JOGO_PRAZO_ATINGIDO: {
    event: "JOGO_PRAZO_ATINGIDO",
    title: "Prazo de análise atingido",
    body: "O prazo de 24h foi atingido. Decida sem autoaprovação.",
    tag: "jogo-prazo-atingido",
    audience: "pai",
    urlFor: ({ jogoId }) => `/atendimentos/${jogoId}`,
  },
  JOGO_CONFIRMADO: {
    event: "JOGO_CONFIRMADO",
    title: "Jogo confirmado",
    body: "Seu Jogo foi confirmado. Abra o link seguro do atendimento.",
    tag: "jogo-confirmado",
    audience: "visitante",
    urlFor: ({ accessToken }) =>
      accessToken ? `/marcar/acesso/${encodeURIComponent(accessToken)}` : "/marcar",
  },
  JOGO_RECUSADO: {
    event: "JOGO_RECUSADO",
    title: "Solicitação atualizada",
    body: "Há uma atualização sobre sua solicitação de Jogo. Confira em Marcar.",
    tag: "jogo-recusado",
    audience: "visitante",
    urlFor: () => "/marcar",
  },
  JOGO_NOVO_COMPROVANTE: {
    event: "JOGO_NOVO_COMPROVANTE",
    title: "Novo comprovante solicitado",
    body: "É necessário enviar um novo comprovante para continuar.",
    tag: "jogo-novo-comprovante",
    audience: "visitante",
    urlFor: () => "/marcar",
  },
  JOGO_LEMBRETE_1H: {
    event: "JOGO_LEMBRETE_1H",
    title: "Jogo em 1 hora",
    body: "Seu horário de Jogo começa em cerca de 1 hora.",
    tag: "jogo-lembrete-1h",
    audience: "ambos",
    urlFor: ({ jogoId, accessToken }) =>
      accessToken
        ? `/marcar/acesso/${encodeURIComponent(accessToken)}`
        : `/atendimentos/${jogoId}`,
  },
  JOGO_LEMBRETE_15MIN: {
    event: "JOGO_LEMBRETE_15MIN",
    title: "Jogo em 15 minutos",
    body: "Seu horário de Jogo começa em cerca de 15 minutos.",
    tag: "jogo-lembrete-15min",
    audience: "ambos",
    urlFor: ({ jogoId, accessToken }) =>
      accessToken
        ? `/marcar/acesso/${encodeURIComponent(accessToken)}`
        : `/atendimentos/${jogoId}`,
  },
};

export function isJogoPushEvent(value: unknown): value is JogoPushEvent {
  return typeof value === "string" && (JOGO_PUSH_EVENTS as readonly string[]).includes(value);
}

export function getJogoPushTemplate(event: JogoPushEvent): JogoPushTemplate {
  return TEMPLATES[event];
}

export function buildJogoPushPayload(
  event: JogoPushEvent,
  ctx: { jogoId: string; accessToken?: string },
) {
  const t = getJogoPushTemplate(event);
  return {
    title: t.title,
    body: t.body,
    tag: `${t.tag}-${ctx.jogoId}`,
    url: t.urlFor(ctx),
    audience: t.audience,
  };
}
