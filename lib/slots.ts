import type { Appointment, JogoSlotHold, PublishedSlot } from "@/types";
import { formatDateTime } from "@/lib/format";
import { isScheduledAtHeld, pruneJogoSlotHolds } from "@/lib/jogo";

const OCCUPYING: Appointment["status"][] = [
  "SOLICITADO",
  "CONFIRMADO",
  "EM_ATENDIMENTO",
];

export function isSlotOccupied(
  scheduledAt: string,
  appointments: Appointment[],
  holds?: JogoSlotHold[],
  exceptAppointmentId?: string,
) {
  const byAppointment = appointments.some(
    (a) =>
      a.scheduled_at === scheduledAt &&
      a.id !== exceptAppointmentId &&
      OCCUPYING.includes(a.status) &&
      a.jogo_status !== "cancelado" &&
      a.jogo_status !== "recusado",
  );
  if (byAppointment) return true;
  return isScheduledAtHeld(scheduledAt, holds, exceptAppointmentId);
}

export function occupyingAppointment(
  scheduledAt: string,
  appointments: Appointment[],
) {
  return (
    appointments.find(
      (a) =>
        a.scheduled_at === scheduledAt &&
        OCCUPYING.includes(a.status) &&
        a.jogo_status !== "cancelado" &&
        a.jogo_status !== "recusado",
    ) ?? null
  );
}

export type SlotView = PublishedSlot & {
  status: "livre" | "ocupado";
  appointment: Appointment | null;
};

export function buildSlotViews(
  publishedSlots: PublishedSlot[],
  appointments: Appointment[],
  holds?: JogoSlotHold[],
): SlotView[] {
  const activeHolds = pruneJogoSlotHolds(holds);
  return publishedSlots
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .filter((s) => new Date(s.scheduled_at).getTime() >= Date.now() - 60_000)
    .map((slot) => {
      const appointment = occupyingAppointment(slot.scheduled_at, appointments);
      const held = isScheduledAtHeld(slot.scheduled_at, activeHolds);
      return {
        ...slot,
        status: appointment || held ? ("ocupado" as const) : ("livre" as const),
        appointment,
      };
    });
}

export function freedSlotMessage(scheduledAt: string) {
  return `Horário liberado: ${formatDateTime(scheduledAt)}. Quem quiser pode marcar no App do Cliente.`;
}
