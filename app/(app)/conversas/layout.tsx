"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConversationListPanel } from "@/components/chat/conversation-list-panel";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { useAppStore } from "@/hooks/use-app-store";
import { canAccess } from "@/lib/permissions";
import {
  normalizeStaffHidden,
  staffHiddenIdSet,
} from "@/lib/staff-chat-visibility";
import { cn } from "@/lib/utils";

/**
 * Mobile: lista em /conversas · chat em tela cheia em /conversas/[id]
 * Desktop: lista | chat (WhatsApp Web)
 */
export default function ConversasLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ clientId?: string }>();
  const router = useRouter();
  const {
    state,
    currentUser,
    hideStaffChat,
    refreshCloudChat,
    syncStaffChatVisibility,
  } = useAppStore();

  const isStaff = currentUser?.role !== "cliente";
  const activeId = typeof params.clientId === "string" ? params.clientId : null;
  const onThread = Boolean(activeId);
  const showPush =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";

  const hidden = useMemo(
    () =>
      staffHiddenIdSet(
        normalizeStaffHidden(state.staffHiddenClientIds, state.staffHiddenAt),
      ),
    [state.staffHiddenAt, state.staffHiddenClientIds],
  );

  useEffect(() => {
    void refreshCloudChat();
  }, [refreshCloudChat]);

  // Sempre que mensagens mudam: se chegou algo depois da exclusão, volta à lista
  useEffect(() => {
    if (!isStaff) return;
    syncStaffChatVisibility();
  }, [isStaff, syncStaffChatVisibility, state.messages]);

  if (!canAccess(currentUser?.role, "chat")) {
    return <>{children}</>;
  }

  function onHide(clientId: string) {
    if (
      !confirm(
        "Remover esta conversa da sua lista? O cliente continua vendo o histórico completo.",
      )
    ) {
      return;
    }
    hideStaffChat(clientId);
    if (activeId === clientId) router.push("/conversas");
  }

  const list = (
    <ConversationListPanel
      messages={state.messages}
      clients={state.clients}
      notifications={state.notifications}
      hiddenIds={hidden}
      activeId={activeId}
      hrefFor={(id) => `/conversas/${id}`}
      onHide={isStaff ? onHide : undefined}
      title="Conversas"
      subtitle="ILÉ OLÓRÒKÈ ÀṢẸ"
      onlyWithMessages
      className="h-full min-h-0"
    />
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#d1d7db]">
      <div
        className={cn(
          "h-full min-h-0 flex-col",
          onThread ? "hidden md:flex" : "flex",
          "w-full md:w-[38%] md:max-w-[420px] md:shrink-0",
        )}
      >
        {showPush && !onThread ? (
          <div className="shrink-0 space-y-2 border-b border-navy/10 bg-white px-3 py-2 md:hidden">
            <InstallAppBanner />
            <EnablePushBanner />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">{list}</div>
      </div>

      <div
        className={cn(
          "h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          onThread ? "flex" : "hidden md:flex",
        )}
      >
        {children}
      </div>
    </div>
  );
}
