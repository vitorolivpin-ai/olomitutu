"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, Plus, Search, X } from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorMessage, LoadingBlock } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { useInternalNotices } from "@/hooks/use-internal-notices";
import { subscribeWebPush } from "@/lib/push-client";
import { INTERNAL_SECTORS, NOTICE_PRIORITY_LABEL, NOTICE_STATUS_LABEL, sectorLabel } from "@/lib/internal-notices";
import type { InternalNotice, InternalNoticePriority, InternalNoticeType, InternalSector } from "@/types";
import { formatDateTime } from "@/lib/format";

type Tab = "recebidos" | "enviados" | "andamento" | "concluidos";

function statusTone(status: InternalNotice["status"]): "success" | "warning" | "info" | "muted" | "danger" {
  if (status === "concluido" || status === "publicado") return "success";
  if (status === "novo" || status === "rascunho") return "info";
  if (status === "cancelado" || status === "expirado") return "muted";
  if (status === "arquivado") return "muted";
  return "warning";
}

export function InternalNoticesPage() {
  const { currentUser, state } = useAppStore();
  const { items, historyFor, ready, error, sector, isChild, create, transition, refresh } = useInternalNotices();
  const [tab, setTab] = useState<Tab>("recebidos");
  const [createOpen, setCreateOpen] = useState(false);
  const [noticeType, setNoticeType] = useState<InternalNoticeType>("sector_request");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetSector, setTargetSector] = useState<InternalSector>("estoque");
  const [priority, setPriority] = useState<InternalNoticePriority>("normal");
  const [dueAt, setDueAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [period, setPeriod] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");

  const isAdmin = currentUser?.role === "administrador";
  const canAccessNoticeCenter = Boolean(sector || isChild);

  useEffect(() => {
    if (sector && targetSector === sector) {
      setTargetSector(INTERNAL_SECTORS.find((item) => item.value !== sector)?.value ?? "administracao");
    }
  }, [sector, targetSector]);

  async function enableNoticePush() {
    setPushBusy(true);
    setPushMessage("");
    const result = await subscribeWebPush();
    setPushBusy(false);
    setPushMessage(result.ok ? "Notificações de avisos ativadas." : result.error);
  }

  const counts = useMemo(() => ({
    recebidos: items.filter((item) => item.notice_type === "sector_request" && (isAdmin || item.target_sector === sector) && !["concluido", "cancelado", "arquivado"].includes(item.status)).length,
    enviados: items.filter((item) => isAdmin || item.created_by === currentUser?.id).length,
    andamento: items.filter((item) => item.status === "em_andamento").length,
    concluidos: items.filter((item) => ["concluido", "cancelado", "arquivado"].includes(item.status)).length,
  }), [currentUser?.id, isAdmin, items, sector]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (isChild && item.notice_type !== "filhos_announcement") return false;
      if (tab === "recebidos" && item.notice_type === "sector_request" && item.target_sector !== sector && !isAdmin) return false;
      if (tab === "enviados" && item.created_by !== currentUser?.id && !isAdmin) return false;
      if (tab === "andamento" && item.status !== "em_andamento") return false;
      if (tab === "concluidos" && !["concluido", "cancelado", "arquivado"].includes(item.status)) return false;
      if (sectorFilter && item.source_sector !== sectorFilter && item.target_sector !== sectorFilter) return false;
      if (priorityFilter && item.priority !== priorityFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (period && !item.created_at.startsWith(period)) return false;
      if (responsibleFilter && item.assigned_to !== responsibleFilter) return false;
      if (query && !`${item.title} ${item.body}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [currentUser?.id, isAdmin, isChild, items, period, priorityFilter, responsibleFilter, search, sector, sectorFilter, statusFilter, tab]);

  const profilesById = useMemo(
    () => new Map(state.profiles.map((profile) => [profile.id, profile.full_name])),
    [state.profiles],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const result = await create({
      notice_type: noticeType,
      title,
      body,
      ...(noticeType === "sector_request" ? { target_sector: targetSector, due_at: dueAt ? new Date(dueAt).toISOString() : undefined } : {}),
      ...(noticeType === "filhos_announcement" ? {
          starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        publish: publishNow,
      } : {}),
      priority,
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setTitle("");
    setBody("");
    setDueAt("");
    setStartsAt("");
    setExpiresAt("");
    setCreateOpen(false);
    await refresh();
  }

  if (isChild && !currentUser?.person_kind) return <EmptyState title="Acesso não autorizado" />;
  if (!canAccessNoticeCenter) return <EmptyState title="Acesso não autorizado" />;

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title={isChild ? "Avisos da casa" : "Central de Avisos"}
        subtitle={isChild ? "Comunicados destinados aos Filhos de Santo." : "Solicitações entre setores e comunicados."}
      />
      {!isChild ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Caixas de avisos">
            {([
              ["recebidos", `Recebidos (${counts.recebidos})`],
              ["enviados", `Enviados (${counts.enviados})`],
              ["andamento", `Em andamento (${counts.andamento})`],
              ["concluidos", `Concluídos (${counts.concluidos})`],
            ] as Array<[Tab, string]>).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${tab === id ? "border-navy bg-navy text-white" : "border-navy/15 bg-white text-navy/75"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(sector || isChild) ? (
              <Button type="button" variant="secondary" disabled={pushBusy} onClick={() => void enableNoticePush()}>
                <Bell className="h-4 w-4" /> {pushBusy ? "Ativando…" : "Ativar push"}
              </Button>
            ) : null}
            {!isChild ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Novo aviso
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {pushMessage ? <p className="text-sm text-navy/65">{pushMessage}</p> : null}

      {createOpen ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Novo aviso</CardTitle>
            <button type="button" aria-label="Fechar formulário" onClick={() => setCreateOpen(false)} className="rounded-lg p-2 text-navy/60 hover:bg-navy/5"><X className="h-4 w-4" /></button>
          </div>
          {isAdmin ? (
            <div className="mt-3 flex gap-2" role="group" aria-label="Tipo de aviso">
              <Button type="button" size="sm" variant={noticeType === "sector_request" ? "primary" : "secondary"} onClick={() => setNoticeType("sector_request")}>Solicitação interna</Button>
              <Button type="button" size="sm" variant={noticeType === "filhos_announcement" ? "primary" : "secondary"} onClick={() => setNoticeType("filhos_announcement")}>Comunicado para Filhos</Button>
            </div>
          ) : null}
          <form onSubmit={(event) => void onSubmit(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label htmlFor="notice-title">Título *</Label><Input id="notice-title" maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} /></div>
            <div className="sm:col-span-2"><Label htmlFor="notice-body">{noticeType === "filhos_announcement" ? "Mensagem *" : "Descrição *"}</Label><Textarea id="notice-body" maxLength={4000} rows={4} required value={body} onChange={(event) => setBody(event.target.value)} /></div>
            {noticeType === "sector_request" ? (
              <div><Label htmlFor="notice-target">Direcionar para *</Label><Select id="notice-target" value={targetSector} onChange={(event) => setTargetSector(event.target.value as InternalSector)}>{INTERNAL_SECTORS.filter((item) => item.value !== sector).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
            ) : (
              <>
                <div><Label>Público-alvo</Label><Input value="Filhos de Santo" readOnly /></div>
                <label className="flex min-h-12 items-center gap-2 text-sm text-navy"><input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} /> Publicar após criar</label>
              </>
            )}
            <div><Label htmlFor="notice-priority">Prioridade *</Label><Select id="notice-priority" value={priority} onChange={(event) => setPriority(event.target.value as InternalNoticePriority)}><option value="normal">Normal</option><option value="importante">Importante</option><option value="urgente">Urgente</option></Select></div>
            {noticeType === "sector_request" ? <div><Label htmlFor="notice-due">Prazo opcional</Label><Input id="notice-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div> : <><div><Label htmlFor="notice-start">Data inicial</Label><Input id="notice-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></div><div><Label htmlFor="notice-expiry">Data final opcional</Label><Input id="notice-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></div></>}
            {formError ? <div className="sm:col-span-2"><ErrorMessage message={formError} /></div> : null}
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : noticeType === "filhos_announcement" && !publishNow ? "Salvar rascunho" : "Enviar aviso"}</Button><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button></div>
          </form>
        </Card>
      ) : null}

      {!isChild ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select aria-label="Filtrar setor" value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}><option value="">Todos os setores</option>{INTERNAL_SECTORS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select>
          <Select aria-label="Filtrar prioridade" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">Todas as prioridades</option>{Object.entries(NOTICE_PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Select aria-label="Filtrar status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos os status</option>{Object.entries(NOTICE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input aria-label="Filtrar período" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
          <Select aria-label="Filtrar responsável" value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value)}><option value="">Todos os responsáveis</option>{Array.from(new Set(items.map((item) => item.assigned_to).filter((value): value is string => Boolean(value)))).map((id) => <option key={id} value={id}>{profilesById.get(id) ?? id}</option>)}</Select>
          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-navy/15 bg-white px-4 text-navy/55"><Search className="h-4 w-4 shrink-0" aria-hidden="true" /><input aria-label="Buscar título ou descrição" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar título ou texto" className="min-w-0 flex-1 bg-transparent text-base text-navy outline-none" /></label>
        </div>
      ) : null}

      {error ? <ErrorMessage message={error} /> : null}
      {!ready ? <LoadingBlock /> : filtered.length === 0 ? <EmptyState title={isChild ? "Nenhum comunicado disponível" : "Nenhum aviso nesta caixa"} /> : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const isRequest = item.notice_type === "sector_request";
            const isRecipient = item.target_sector === sector;
            const canManageNotice = isAdmin || isRecipient;
            return (
              <Card key={item.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><CardTitle>{item.title}</CardTitle><p className="mt-1 text-sm text-navy/65 line-clamp-2">{item.body}</p></div>
                  <Badge tone={statusTone(item.status)}>{NOTICE_STATUS_LABEL[item.status]}</Badge>
                </div>
                {!isChild ? <p className="text-xs text-navy/55">{sectorLabel(item.source_sector)} → {isRequest ? sectorLabel(item.target_sector) : "Filhos de Santo"}</p> : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy/55"><span>{NOTICE_PRIORITY_LABEL[item.priority]}</span><span>{formatDateTime(item.created_at)}</span>{item.due_at ? <span>Prazo: {formatDateTime(item.due_at)}</span> : null}{item.assigned_to ? <span>Responsável: {profilesById.get(item.assigned_to) ?? item.assigned_to}</span> : null}</div>
                <div className="flex flex-wrap gap-2">
                  {isRequest && isRecipient && item.status === "novo" ? <Button size="sm" variant="secondary" onClick={() => void transition(item.id, "viewed")}>Marcar visualizado</Button> : null}
                  {isRequest && isRecipient && !item.assigned_to && !["concluido", "cancelado", "arquivado"].includes(item.status) ? <Button size="sm" variant="secondary" onClick={() => void transition(item.id, "assume")}>Assumir</Button> : null}
                  {isRequest && isRecipient && ["novo", "visualizado", "em_andamento"].includes(item.status) ? <Button size="sm" onClick={() => void transition(item.id, "started")}>Em andamento</Button> : null}
                  {isRequest && isRecipient && item.status === "em_andamento" ? <Button size="sm" variant="gold" onClick={() => void transition(item.id, "completed")}>Concluir</Button> : null}
                  {canManageNotice && isAdmin && item.notice_type === "filhos_announcement" && item.status === "rascunho" ? <Button size="sm" onClick={() => void transition(item.id, "published")}>Publicar</Button> : null}
                  {(isAdmin || item.created_by === currentUser?.id) && isRequest && !["concluido", "cancelado", "arquivado"].includes(item.status) ? <Button size="sm" variant="danger" onClick={() => void transition(item.id, "cancelled")}>Cancelar</Button> : null}
                  {!isChild && !["arquivado"].includes(item.status) && ["concluido", "cancelado", "expirado", "rascunho", "publicado"].includes(item.status) ? <Button size="sm" variant="ghost" onClick={() => void transition(item.id, "archived")}>Arquivar</Button> : null}
                </div>
                <details className="border-t border-navy/10 pt-2"><summary className="cursor-pointer text-sm font-medium text-gold-deep">Histórico</summary><ul className="mt-2 space-y-1 text-xs text-navy/65">{historyFor(item.id).map((entry) => <li key={entry.id}>{formatDateTime(entry.created_at)} · {entry.action}{entry.note ? ` · ${entry.note}` : ""}</li>)}</ul></details>
                              <details className="border-t border-navy/10 pt-2"><summary className="cursor-pointer text-sm font-medium text-gold-deep">Histórico</summary><ul className="mt-2 space-y-1 text-xs text-navy/65">{historyFor(item.id).map((entry) => <li key={entry.id}>{formatDateTime(entry.created_at)} · {entry.action} · {profilesById.get(entry.changed_by) ?? "Usuário"}{entry.note ? ` · ${entry.note}` : ""}</li>)}</ul></details>
                              <div><Label htmlFor="notice-start">Data inicial *</Label><Input id="notice-start" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}