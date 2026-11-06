/** Links oficiais WhatsApp da casa (App do Cliente). */
const PAI_MESSAGE_CODE = "FU7H6HNDN7DRH1";

/** Link oficial do Pai (Instagram / Click to Chat). */
export const PAI_WHATSAPP_URL =
  `https://api.whatsapp.com/message/${PAI_MESSAGE_CODE}?autoload=1&app_absent=0`;

export const CLIENT_WHATSAPP = {
  duvidas: {
    label: "Dúvidas",
    href: PAI_WHATSAPP_URL,
  },
  grupo: {
    label: "Àwùjo Yándé — ibi tí Orí n bá Orí pàdé",
    href: "https://chat.whatsapp.com/C7B3qnLoDbTDPna2SBQ6MX",
  },
} as const;

function isMobileUa() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Abre WhatsApp de forma confiável no celular (app nativo).
 * Evita target=_blank (iOS cancela) e prefere wa.me/message no mobile.
 */
export function openWhatsApp(href: string) {
  if (typeof window === "undefined") return;

  let url = href.trim();

  // Remove tracking (fbclid/utm) que às vezes atrapalha o redirect do WhatsApp
  try {
    const u = new URL(url);
    ["fbclid", "utm_source", "utm_medium", "utm_content", "utm_campaign"].forEach((k) =>
      u.searchParams.delete(k),
    );
    url = u.toString();
  } catch {
    /* mantém url original */
  }

  const msgMatch = url.match(/\/message\/([A-Za-z0-9]+)/);
  if (msgMatch) {
    const code = msgMatch[1];
    // No celular, wa.me costuma abrir o app; no desktop, api.whatsapp.com
    url = isMobileUa()
      ? `https://wa.me/message/${code}`
      : `https://api.whatsapp.com/message/${code}?autoload=1&app_absent=0`;
  }

  // Mesma aba — o sistema operacional entrega ao WhatsApp
  window.location.assign(url);
}
