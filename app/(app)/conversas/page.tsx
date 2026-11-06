"use client";

import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { BrandMark } from "@/components/brand/logo";
import { useAppStore } from "@/hooks/use-app-store";

/** Painel direito no desktop (WhatsApp Web). No mobile a lista vem do layout. */
export default function ConversationsPage() {
  const { currentUser } = useAppStore();
  const showPushBanner =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#f0f2f5] px-6">
      <BrandMark className="h-28 w-28 opacity-90" />
      <p className="mt-6 font-display text-3xl text-navy">OLÓMÌ TÚTÙ</p>
      <p className="mt-2 max-w-sm text-center text-sm text-navy/55">
        Selecione uma conversa à esquerda para ler e responder.
      </p>
      {showPushBanner ? (
        <div className="mt-8 w-full max-w-md space-y-3">
          <InstallAppBanner />
          <EnablePushBanner />
        </div>
      ) : null}
    </div>
  );
}
