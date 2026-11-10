"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import {
  canCreateChildrenAnnouncement,
  canCreateSectorRequest,
  isChildProfile,
  sectorForRole,
} from "@/lib/internal-notices";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  createInternalNoticeRemote,
  expireInternalNoticesRemote,
  fetchInternalNoticeHistory,
  fetchInternalNotices,
  transitionInternalNoticeRemote,
  type CreateInternalNoticeInput,
} from "@/lib/supabase/internal-notices";
import type { InternalNotice, InternalNoticeHistoryEntry } from "@/types";

const LOCAL_KEY = "ile-internal-notices-demo-v1";

type LocalStore = { items: InternalNotice[]; history: InternalNoticeHistoryEntry[] };

function readLocal(): LocalStore {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null") ?? { items: [], history: [] };
  } catch {
    return { items: [], history: [] };
  }
}

function writeLocal(value: LocalStore) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
  } catch {
    // Keep the page usable when browser storage is unavailable.
  }
}

export function useInternalNotices() {
  const { currentUser } = useAppStore();
  const [items, setItems] = useState<InternalNotice[]>([]);
  const [history, setHistory] = useState<InternalNoticeHistoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloud = isSupabaseConfigured();
  const sector = sectorForRole(currentUser?.role);
  const isChild = isChildProfile(currentUser);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setItems([]);
      setHistory([]);
      setReady(true);
      return;
    }
    setError(null);
    if (!cloud) {
      const local = readLocal();
      const currentSector = sectorForRole(currentUser.role);
      const now = Date.now();
      const expired = currentSector
        ? local.items.filter((item) =>
            item.notice_type === "filhos_announcement" &&
            item.status === "publicado" &&
            item.expires_at &&
            new Date(item.expires_at).getTime() <= now,
          )
        : [];
      const expiredIds = new Set(expired.map((item) => item.id));
      const nextLocal = expired.length
        ? {
            items: local.items.map((item) => expiredIds.has(item.id)
              ? { ...item, status: "expirado" as const, updated_at: new Date().toISOString() }
              : item),
            history: [
              ...local.history,
              ...expired.map((item) => ({
                id: `history-expired-${item.id}`,
                notice_id: item.id,
                action: "expired",
                from_status: "publicado" as const,
                to_status: "expirado" as const,
                changed_by: currentUser.id,
                created_at: new Date().toISOString(),
              })),
            ],
          }
        : local;
      if (expired.length) writeLocal(nextLocal);
      setItems(nextLocal.items);
      setHistory(nextLocal.history);
      setReady(true);
      return;
    }
    const supabase = createBrowserClient();
    if (!supabase) {
      setError("A Central de Avisos não está disponível.");
      setReady(true);
      return;
    }
    if (sectorForRole(currentUser.role)) await expireInternalNoticesRemote(supabase);
    const notices = await fetchInternalNotices(supabase);
    if (!notices.ok) {
      setError(notices.error);
      setItems([]);
      setHistory([]);
      setReady(true);
      return;
    }
    setItems(notices.items);
    if (isChild) {
      setHistory([]);
      setReady(true);
      return;
    }
    const trail = await fetchInternalNoticeHistory(supabase, notices.items.map((item) => item.id));
    if (trail.ok) setHistory(trail.items);
    else setError(trail.error);
    setReady(true);
  }, [cloud, currentUser, isChild]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleItems = useMemo(() => {
    if (isChild) {
      const now = Date.now();
      return items.filter((item) =>
        item.notice_type === "filhos_announcement" &&
        item.target_audience === "filhos_de_santo" &&
        item.status === "publicado" &&
        (!item.starts_at || new Date(item.starts_at).getTime() <= now) &&
        (!item.expires_at || new Date(item.expires_at).getTime() > now),
      );
    }
    if (currentUser?.role === "administrador") return items;
    if (!sector || !currentUser) return [];
    return items.filter((item) =>
      item.notice_type === "sector_request" &&
      (item.source_sector === sector || item.target_sector === sector || item.assigned_to === currentUser.id),
    );
  }, [currentUser, isChild, items, sector]);

  const noticeHistory = useCallback(
    (noticeId: string) => history.filter((entry) => entry.notice_id === noticeId),
    [history],
  );

  const create = useCallback(async (input: CreateInternalNoticeInput) => {
    if (!currentUser) return { ok: false as const, error: "Faça login para criar um aviso." };
    if (input.notice_type === "sector_request" && !canCreateSectorRequest(currentUser)) {
      return { ok: false as const, error: "Seu perfil não pode criar solicitações internas." };
    }
    if (input.notice_type === "filhos_announcement" && !canCreateChildrenAnnouncement(currentUser)) {
      return { ok: false as const, error: "Somente Administração publica comunicados para Filhos de Santo." };
    }
    if (input.title.trim().length < 3 || input.title.trim().length > 120) {
      return { ok: false as const, error: "O título deve ter entre 3 e 120 caracteres." };
    }
    if (input.body.trim().length < 3 || input.body.trim().length > 4000) {
      return { ok: false as const, error: "A descrição deve ter entre 3 e 4000 caracteres." };
    }
    if (input.notice_type === "sector_request" && (!input.target_sector || input.target_sector === sector)) {
      return { ok: false as const, error: "Selecione um setor de destino diferente do setor de origem." };
    }
    if (input.notice_type === "filhos_announcement" && input.expires_at && input.starts_at && input.expires_at <= input.starts_at) {
      return { ok: false as const, error: "A data final deve ser posterior à data inicial." };
    }

    let result: { ok: true; item: InternalNotice } | { ok: false; error: string };
    if (cloud) {
      const supabase = createBrowserClient();
      if (!supabase) return { ok: false as const, error: "Central indisponível." };
      result = await createInternalNoticeRemote(supabase, input);
    } else {
      if (!sector) return { ok: false as const, error: "Seu perfil não pertence a um setor interno." };
      const stamp = new Date().toISOString();
      const item: InternalNotice = {
        id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        notice_type: input.notice_type,
        title: input.title.trim(),
        body: input.body.trim(),
        source_sector: sector,
        target_sector: input.notice_type === "sector_request" ? input.target_sector ?? null : null,
        target_audience: input.notice_type === "filhos_announcement" ? "filhos_de_santo" : null,
        priority: input.priority,
        status: input.notice_type === "filhos_announcement" ? (input.publish ? "publicado" : "rascunho") : "novo",
        created_by: currentUser.id,
        due_at: input.due_at ?? null,
        starts_at: input.starts_at ?? null,
        expires_at: input.expires_at ?? null,
        created_at: stamp,
        updated_at: stamp,
      };
      const local = readLocal();
      const entry: InternalNoticeHistoryEntry = {
        id: `history-${Date.now()}`,
        notice_id: item.id,
        action: item.status === "publicado" ? "published" : "created",
        from_status: null,
        to_status: item.status,
        changed_by: currentUser.id,
        created_at: stamp,
      };
      writeLocal({ items: [item, ...local.items], history: [...local.history, entry] });
      result = { ok: true, item };
    }

    if (!result.ok) return result;
    if (cloud) void fetch("/api/push/notify-notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notice_id: result.item.id, event: "created" }),
    }).catch(() => null);
    await refresh();
    return result;
  }, [cloud, currentUser, refresh, sector]);

  const transition = useCallback(async (
    noticeId: string,
    action: "viewed" | "assume" | "started" | "completed" | "cancelled" | "archived" | "published",
    note?: string,
  ) => {
    if (!currentUser) return { ok: false as const, error: "Faça login para continuar." };
    let result: { ok: true; item: InternalNotice } | { ok: false; error: string };
    if (cloud) {
      const supabase = createBrowserClient();
      if (!supabase) return { ok: false as const, error: "Central indisponível." };
      result = await transitionInternalNoticeRemote(supabase, { notice_id: noticeId, action, note });
    } else {
      const local = readLocal();
      const item = local.items.find((notice) => notice.id === noticeId);
      if (!item) return { ok: false as const, error: "Aviso não encontrado." };
      const isAdmin = currentUser.role === "administrador";
      const isSource = item.created_by === currentUser.id;
      const isTarget = item.target_sector === sector;
      if (isChild || (!isAdmin && !isSource && !isTarget && item.assigned_to !== currentUser.id)) {
        return { ok: false as const, error: "Acesso não autorizado." };
      }
      const stamp = new Date().toISOString();
      const oldStatus = item.status;
      const next = { ...item, updated_at: stamp };
      if (action === "viewed" && isTarget && next.notice_type === "sector_request") {
        next.status = next.status === "novo" ? "visualizado" : next.status;
        next.viewed_at ??= stamp;
      } else if (action === "assume" && isTarget && next.notice_type === "sector_request") {
        next.assigned_to = currentUser.id;
        next.status = next.status === "novo" ? "visualizado" : next.status;
        next.viewed_at ??= stamp;
      } else if (action === "started" && isTarget && next.notice_type === "sector_request") {
        next.status = "em_andamento";
        next.assigned_to ??= currentUser.id;
        next.viewed_at ??= stamp;
        next.started_at ??= stamp;
      } else if (action === "completed" && isTarget && next.notice_type === "sector_request" && next.status === "em_andamento") {
        next.status = "concluido";
        next.completed_at = stamp;
      } else if (action === "cancelled" && (isAdmin || isSource) && next.notice_type === "sector_request") {
        next.status = "cancelado";
        next.cancelled_at = stamp;
      } else if (action === "archived" && (isAdmin || isSource || isTarget)) {
        next.status = "arquivado";
        next.archived_at = stamp;
      } else if (action === "published" && isAdmin && next.notice_type === "filhos_announcement") {
        next.status = "publicado";
      } else {
        return { ok: false as const, error: "Ação não permitida para este aviso." };
      }
      const entry: InternalNoticeHistoryEntry = {
        id: `history-${Date.now()}`,
        notice_id: noticeId,
        action,
        from_status: oldStatus,
        to_status: next.status,
        changed_by: currentUser.id,
        note: note?.trim() || null,
        created_at: stamp,
      };
      writeLocal({
        items: local.items.map((notice) => notice.id === noticeId ? next : notice),
        history: [...local.history, entry],
      });
      result = { ok: true, item: next };
    }
    if (!result.ok) return result;
    if (cloud) void fetch("/api/push/notify-notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notice_id: noticeId, event: action }),
    }).catch(() => null);
    await refresh();
    return result;
  }, [cloud, currentUser, isChild, refresh, sector]);

  return {
    items: visibleItems,
    ready,
    error,
    sector,
    isChild,
    refresh,
    create,
    transition,
    historyFor: noticeHistory,
  };
}