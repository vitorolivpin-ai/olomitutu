import type { Client } from "@/types";

export function isClientRegistrationComplete(client: Client | null | undefined) {
  if (!client) return false;
  if (client.registration_complete) return true;
  return Boolean(
    client.full_name?.trim() &&
      client.birth_date &&
      client.phone?.trim() &&
      client.phone.trim().length >= 8,
  );
}
