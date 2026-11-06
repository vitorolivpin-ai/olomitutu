/** Links oficiais WhatsApp da casa (App do Cliente). */
export const CLIENT_WHATSAPP = {
  duvidas: {
    label: "Dúvidas",
    href: "https://api.whatsapp.com/message/FU7H6HNDN7DRH1?autoload=1&app_absent=0",
  },
  grupo: {
    label: "Àwùjo Yándé — ibi tí Orí n bá Orí pàdé",
    href: "https://chat.whatsapp.com/C7B3qnLoDbTDPna2SBQ6MX",
  },
} as const;

/**
 * Abre WhatsApp de forma confiável no celular.
 * `target=_blank` + fechar drawer no mesmo clique costuma cancelar a navegação no iOS.
 */
export function openWhatsApp(href: string) {
  if (typeof window === "undefined") return;
  window.location.assign(href);
}
