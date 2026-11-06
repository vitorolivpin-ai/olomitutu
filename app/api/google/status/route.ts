import { NextResponse } from "next/server";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user || !supabase) {
    return NextResponse.json({ configured: true, connected: false });
  }

  const { data: own } = await supabase
    .from("google_calendar_connections")
    .select("google_email, connected_at, calendar_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (own) {
    return NextResponse.json({
      configured: true,
      connected: true,
      google_email: own.google_email,
      connected_at: own.connected_at,
    });
  }

  // Qualquer conexão da casa (para status na UI do admin)
  const admin = createAdminClient();
  if (admin) {
    const { data: anyConn } = await admin
      .from("google_calendar_connections")
      .select("google_email, connected_at")
      .limit(1)
      .maybeSingle();
    if (anyConn) {
      return NextResponse.json({
        configured: true,
        connected: true,
        house: true,
        google_email: anyConn.google_email,
        connected_at: anyConn.connected_at,
      });
    }
  }

  return NextResponse.json({ configured: true, connected: false });
}
