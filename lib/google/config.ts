import { getAppOrigin } from "@/lib/supabase/config";

export function isGoogleCalendarConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID ?? "";
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  return Boolean(id && secret && !id.includes("YOUR_"));
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const origin = getAppOrigin() || "http://localhost:3000";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.replace(/\/$/, "") ||
    `${origin}/api/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");
