import { NextResponse } from "next/server";
import { isGoogleCalendarConfigured } from "@/lib/google/config";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "pai_de_santo") {
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

  return NextResponse.json({ configured: true, connected: false });
}
