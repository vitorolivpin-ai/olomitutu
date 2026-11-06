"use client";

import { useEffect } from "react";
import { openWhatsApp, CLIENT_WHATSAPP } from "@/lib/client-whatsapp";

/** Chat sem conta → WhatsApp do Pai. */
export default function ClienteMensagensRedirect() {
  useEffect(() => {
    openWhatsApp(CLIENT_WHATSAPP.duvidas.href);
    window.location.replace("/marcar");
  }, []);
  return (
    <p className="p-8 text-center text-sm text-navy/60">Abrindo WhatsApp do Pai…</p>
  );
}
