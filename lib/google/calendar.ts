import { getGoogleOAuthConfig } from "@/lib/google/config";

export type GoogleTokens = {
  refresh_token: string;
  access_token?: string | null;
  access_token_expires_at?: string | null;
  calendar_id?: string | null;
};

export type CalendarEventInput = {
  summary: string;
  description?: string;
  startIso: string;
  durationMinutes: number;
  eventId?: string | null;
};

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Falha ao renovar token Google.");
  }
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString();
  return { accessToken: json.access_token, expiresAt };
}

export async function ensureAccessToken(tokens: GoogleTokens) {
  const expires = tokens.access_token_expires_at
    ? new Date(tokens.access_token_expires_at).getTime()
    : 0;
  if (tokens.access_token && expires > Date.now() + 60_000) {
    return {
      accessToken: tokens.access_token,
      expiresAt: tokens.access_token_expires_at!,
      refreshed: false,
    };
  }
  const next = await refreshAccessToken(tokens.refresh_token);
  return { ...next, refreshed: true };
}

function endIso(startIso: string, durationMinutes: number) {
  return new Date(new Date(startIso).getTime() + durationMinutes * 60_000).toISOString();
}

export async function upsertGoogleEvent(tokens: GoogleTokens, input: CalendarEventInput) {
  const { accessToken, expiresAt, refreshed } = await ensureAccessToken(tokens);
  const calendarId = encodeURIComponent(tokens.calendar_id || "primary");
  const body = {
    summary: input.summary,
    description: input.description ?? "",
    start: { dateTime: input.startIso, timeZone: "America/Sao_Paulo" },
    end: {
      dateTime: endIso(input.startIso, input.durationMinutes),
      timeZone: "America/Sao_Paulo",
    },
  };

  let eventId = input.eventId ?? null;
  let res: Response;

  if (eventId) {
    res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (res.status === 404) {
      eventId = null;
    }
  }

  if (!eventId) {
    res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  }

  const json = (await res!.json()) as { id?: string; error?: { message?: string } };
  if (!res!.ok || !json.id) {
    throw new Error(json.error?.message || "Falha ao gravar evento no Google Calendar.");
  }

  return {
    eventId: json.id,
    accessToken,
    expiresAt,
    refreshed,
  };
}

export async function deleteGoogleEvent(tokens: GoogleTokens, eventId: string) {
  const { accessToken, expiresAt, refreshed } = await ensureAccessToken(tokens);
  const calendarId = encodeURIComponent(tokens.calendar_id || "primary");
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || "Falha ao remover evento do Google Calendar.");
  }
  return { accessToken, expiresAt, refreshed };
}

export async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Falha no OAuth Google.");
  }
  return json;
}

export async function fetchGoogleEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { email?: string };
  return json.email ?? null;
}
