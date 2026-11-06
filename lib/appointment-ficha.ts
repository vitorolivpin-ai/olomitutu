import type { Appointment, Profile, UserRole } from "@/types";

/** Ficha de marcação pública: só o Pai de Santo lê os dados pessoais. */
export function canSeeAppointmentFicha(
  role: UserRole | null | undefined,
  apt?: Pick<Appointment, "pai_only_ficha" | "guest_ficha"> | null,
) {
  if (!role) return false;
  if (!apt?.pai_only_ficha && !apt?.guest_ficha) {
    // Atendimento interno / com conta — staff da casa pode ver
    return role !== "cliente";
  }
  return role === "pai_de_santo";
}

export function appointmentPublicLabel(
  apt: Appointment,
  clientName: string | undefined,
  viewer: Pick<Profile, "role"> | null | undefined,
) {
  if (apt.pai_only_ficha || apt.guest_ficha) {
    if (viewer?.role === "pai_de_santo") {
      return clientName || apt.guest_ficha?.full_name || "Ficha";
    }
    return apt.ficha_code ? `Reservado · ${apt.ficha_code}` : "Horário reservado";
  }
  return clientName || "Cliente";
}
