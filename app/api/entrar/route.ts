import { NextRequest, NextResponse } from "next/server";
import { createSeedState, DEMO_PASSWORD } from "@/lib/seed";
import { homePathForRole } from "@/lib/navigation";
import { isAreaRole } from "@/lib/demo-accounts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createRouteHandlerClient, withAuthCookies } from "@/lib/supabase/route";
import type { UserRole } from "@/types";

function requestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

function redirectWithDemoSession(req: NextRequest, userId: string, role: UserRole) {
  const origin = requestOrigin(req);
  const home = homePathForRole(role);
  const res = NextResponse.redirect(new URL(home, origin));
  res.cookies.set("ile-oloroke-sid", userId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

function clearDemoSid(res: NextResponse) {
  res.cookies.set("ile-oloroke-sid", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}

function fail(req: NextRequest, role: string, message: string) {
  const origin = requestOrigin(req);
  const url = new URL(`/entrar/${role}`, origin);
  url.searchParams.set("erro", message);
  return clearDemoSid(NextResponse.redirect(url));
}

async function loginWithSupabase(
  req: NextRequest,
  roleRaw: UserRole,
  email: string,
  password: string,
) {
  const origin = requestOrigin(req);
  const client = createRouteHandlerClient(req);
  if (!client) {
    return fail(req, roleRaw, "Supabase não configurado.");
  }

  const { supabase, cookieResponse } = client;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const msg =
      error?.message?.toLowerCase().includes("invalid") ||
      error?.message?.toLowerCase().includes("credentials")
        ? "E-mail ou senha inválidos."
        : error?.message || "Não foi possível entrar.";
    return fail(req, roleRaw, msg);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email, full_name, requested_role, approval_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return fail(
      req,
      roleRaw,
      "Perfil não encontrado. Confirme se as migrations 012–013 foram aplicadas.",
    );
  }

  const status = (profile.approval_status as string | null) ?? "approved";
  const requested = (profile.requested_role as string | null) ?? profile.role;

  if (status === "pending" && (requested === roleRaw || profile.role === roleRaw)) {
    await supabase.auth.signOut();
    return fail(
      req,
      roleRaw,
      "Cadastro aguardando aprovação do Pai de Santo.",
    );
  }

  if (status === "rejected" && requested === roleRaw) {
    await supabase.auth.signOut();
    return fail(req, roleRaw, "Este cadastro foi recusado. Fale com a casa.");
  }

  if (profile.role !== roleRaw) {
    await supabase.auth.signOut();
    return fail(
      req,
      roleRaw,
      "Esta conta não tem acesso a esta área. Use o e-mail desta aba.",
    );
  }

  const home = homePathForRole(roleRaw);
  const res = withAuthCookies(
    cookieResponse(),
    NextResponse.redirect(new URL(home, origin)),
  );
  // Mantém cookie legado para o store local sincronizar currentUserId
  res.cookies.set("ile-oloroke-sid", profile.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

function loginDemo(req: NextRequest, roleRaw: UserRole, email: string, password: string) {
  if (password !== DEMO_PASSWORD) {
    return fail(req, roleRaw, "Senha inválida.");
  }

  const seed = createSeedState();
  const profile = seed.profiles.find((p) => p.email.toLowerCase() === email);

  if (!profile) {
    return fail(req, roleRaw, "E-mail não encontrado.");
  }

  if (profile.role !== roleRaw) {
    return fail(
      req,
      roleRaw,
      "Esta conta não tem acesso a esta área. Use o e-mail desta aba.",
    );
  }

  return redirectWithDemoSession(req, profile.id, roleRaw);
}

/**
 * Login por área: e-mail + senha obrigatórios.
 * Com Supabase: Auth real. Sem env: modo demonstração.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const roleRaw = String(form.get("role") ?? "");
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!isAreaRole(roleRaw)) {
    return NextResponse.redirect(new URL("/", requestOrigin(req)));
  }

  if (!email || !password) {
    return fail(req, roleRaw, "Informe e-mail e senha.");
  }

  if (isSupabaseConfigured()) {
    return loginWithSupabase(req, roleRaw, email, password);
  }

  return loginDemo(req, roleRaw, email, password);
}

/** GET antigo sem senha → manda para a tela de login da área */
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role") ?? "";
  const origin = requestOrigin(req);
  if (!isAreaRole(role)) {
    return NextResponse.redirect(new URL("/", origin));
  }
  return NextResponse.redirect(new URL(`/entrar/${role}`, origin));
}
