import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const origin = getAppOrigin() || "http://localhost:3000";
  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user || !supabase) {
    return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
  }

  const { error } = await supabase
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redirect: `${origin}/agenda?gcal=disconnected` });
}
