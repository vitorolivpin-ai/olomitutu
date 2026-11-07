"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { formatDateTime } from "@/lib/format";
import { buildSlotViews } from "@/lib/slots";
import { canAccess } from "@/lib/permissions";

const QUICK_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

export default function DisponibilidadePage() {
  const { state, currentUser, addPublishedSlot, removePublishedSlot } = useAppStore();
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!canAccess(currentUser?.role, "agenda") || currentUser?.role === "cliente") {
    return <EmptyState title="Acesso restrito ao Pai de Santo / Administração" />;
  }

  const views = buildSlotViews(state.publishedSlots ?? [], state.appointments);
  const livres = views.filter((v) => v.status === "livre").length;
  const ocupados = views.filter((v) => v.status === "ocupado").length;

  function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    const scheduled = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduled.getTime())) {
      setError("Data ou horário inválido.");
      return;
    }
    const result = addPublishedSlot({
      scheduled_at: scheduled.toISOString(),
      duration_minutes: Number(duration) || 60,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Horário publicado. Já aparece no App do Cliente.");
  }

  function addQuick(t: string) {
    setTime(t);
    setError("");
    setOk("");
    const scheduled = new Date(`${date}T${t}:00`);
    const result = addPublishedSlot({
      scheduled_at: scheduled.toISOString(),
      duration_minutes: Number(duration) || 60,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(`Horário ${t} publicado.`);
  }

  return (
    <div className="animate-rise space-y-5">
      <BrandPageHeader
        title="Horários disponíveis"
        subtitle="Publique os horários em que você atende. Eles aparecem no App do Cliente. Quando alguém marca, fica ocupado; se cancelar, todos recebem aviso."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs uppercase tracking-wide text-navy/55">Livres</p>
          <p className="mt-1 font-display text-3xl text-leaf">{livres}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-navy/55">Ocupados</p>
          <p className="mt-1 font-display text-3xl text-warning">{ocupados}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Publicar horário</CardTitle>
        <form onSubmit={onAdd} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Horário</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="45">45</option>
              <option value="60">60</option>
              <option value="90">90</option>
            </Select>
          </div>
          <div className="sm:col-span-3">
            {error ? <ErrorMessage message={error} /> : null}
            {ok ? <p className="mb-2 text-sm text-success">{ok}</p> : null}
            <Button type="submit">
              <Plus className="h-4 w-4" /> Publicar horário
            </Button>
          </div>
        </form>
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-navy/55">Atalhos para {date.split("-").reverse().join("/")}</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TIMES.map((t) => (
              <Button key={t} type="button" size="sm" variant="secondary" onClick={() => addQuick(t)}>
                {t}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {views.map((slot) => {
          const client = slot.appointment
            ? state.clients.find((c) => c.id === slot.appointment!.client_id)
            : null;
          return (
            <Card key={slot.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-navy">{formatDateTime(slot.scheduled_at)}</p>
                  <p className="text-sm text-navy/60">{slot.duration_minutes} min</p>
                  {client ? (
                    <p className="mt-1 text-sm text-navy/70">Com: {client.full_name}</p>
                  ) : null}
                </div>
                <Badge tone={slot.status === "livre" ? "success" : "warning"}>
                  {slot.status === "livre" ? "LIVRE" : "OCUPADO"}
                </Badge>
              </div>
              {slot.status === "livre" ? (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  onClick={() => removePublishedSlot(slot.id)}
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </Button>
              ) : null}
            </Card>
          );
        })}
        {views.length === 0 ? (
          <EmptyState
            title="Nenhum horário publicado"
            description="Publique horários acima para o cliente visualizar no app."
          />
        ) : null}
      </div>
    </div>
  );
}
