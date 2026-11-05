import type { Appointment, PublishedSlot } from "@/types";
import { formatDateTime } from "@/lib/format";

const OCCUPYING: Appointment["status"][] = [
  "SOLICITADO",
  "CONFIRMADO",
  "EM_ATENDIMENTO",
];

export function isSlotOccupied(
  scheduledAt: string,
  appointments: Appointment[],
) {
  return appointments.some(
    (a) => a.scheduled_at === scheduledAt && OCCUPYING.includes(a.status),
  );
}

export function occupyingAppointment(
  scheduledAt: string,
  appointments: Appointment[],
) {
  return (
    appointments.find(
      (a) => a.scheduled_at === scheduledAt && OCCUPYING.includes(a.status),
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
): SlotView[] {
  return publishedSlots
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .filter((s) => new Date(s.scheduled_at).getTime() >= Date.now() - 60_000)
    .map((slot) => {
      const appointment = occupyingAppointment(slot.scheduled_at, appointments);
      return {
        ...slot,
        status: appointment ? ("ocupado" as const) : ("livre" as const),
        appointment,
      };
    });
}

export function freedSlotMessage(scheduledAt: string) {
  return `Horário liberado: ${formatDateTime(scheduledAt)}. Quem quiser pode marcar no App do Cliente.`;
}
