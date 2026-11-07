import { NextRequest, NextResponse } from "next/server";
import { createSeedState, DEMO_PASSWORD } from "@/lib/seed";
import { homePathForUser, isFilhoDeSanto } from "@/lib/filho";
import {
  authRoleForArea,
  isAreaRole,
  isFilhoArea,
  type AreaSlug,
} from "@/lib/demo-accounts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createRouteHandlerClient, withAuthCookies } from "@/lib/supabase/route";
import {
  actingProfileForArea,
  paiCanOpenArea,
  VIEW_AS_COOKIE,
} from "@/lib/view-as";
import type { PersonKind, Profile, UserRole } from "@/types";

function requestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

function setViewAsCookie(res: NextResponse, area: AreaSlug | null) {
  if (!area || area === "pai_de_santo") {
    res.cookies.set(VIEW_AS_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
    return res;
  }
  res.cookies.set(VIEW_AS_COOKIE, area, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

function redirectWithDemoSession(
  req: NextRequest,
  userId: string,
  role: UserRole,
  personKind?: PersonKind | null,
  viewAs?: AreaSlug | null,
) {
  const origin = requestOrigin(req);
  const home = homePathForUser({ role, person_kind: personKind ?? undefined });
  const res = NextResponse.redirect(new URL(home, origin));
  res.cookies.set("ile-oloroke-sid", userId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
  return setViewAsCookie(res, viewAs ?? null);
}

function clearDemoSid(res: NextResponse) {
  res.cookies.set("ile-oloroke-sid", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}

function fail(req: NextRequest, area: string, message: string) {
  const origin = requestOrigin(req);
  const url = new URL(`/entrar/${area}`, origin);
  url.searchParams.set("erro", message);
  return clearDemoSid(NextResponse.redirect(url));
}

async function loginWithSupabase(
  req: NextRequest,
  area: AreaSlug,
  email: string,
  password: string,
) {
  const roleRaw = authRoleForArea(area);
  const origin = requestOrigin(req);
  const client = createRouteHandlerClient(req);
  if (!client) {
    return fail(req, area, "Supabase não configurado.");
  }

  const { supabase, cookieResponse } = client;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const msg =
      error?.message?.toLowerCase().includes("invalid") ||
      error?.message?.toLowerCase().includes("credentials")
        ? "E-mail ou senha inválidos."
        : error?.message || "Não foi possível entrar.";
    return fail(req, area, msg);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email, full_name, requested_role, approval_status, person_kind")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return fail(
      req,
      area,
      "Perfil não encontrado. Confirme se as migrations 012–013 foram aplicadas.",
    );
  }

  const status = (profile.approval_status as string | null) ?? "approved";
  const requested = (profile.requested_role as string | null) ?? profile.role;
  const personKind = (profile.person_kind as PersonKind | null) ?? undefined;
  const filhoOk = isFilhoDeSanto({ role: profile.role as UserRole, person_kind: personKind });
  const masterPai = paiCanOpenArea(profile.role as UserRole);

  if (
    !masterPai &&
    status === "pending" &&
    (requested === roleRaw || profile.role === roleRaw || filhoOk)
  ) {
    await supabase.auth.signOut();
    return fail(req, area, "Cadastro aguardando aprovação do Pai de Santo.");
  }

  if (!masterPai && status === "rejected" && (requested === roleRaw || filhoOk)) {
    await supabase.auth.signOut();
    return fail(req, area, "Este cadastro foi recusado. Fale com a casa.");
  }

  if (!masterPai && profile.role !== roleRaw) {
    await supabase.auth.signOut();
    return fail(
      req,
      area,
      "Esta conta não tem acesso a esta área. Use o e-mail desta aba.",
    );
  }

  if (!masterPai && isFilhoArea(area) && !filhoOk) {
    await supabase.auth.signOut();
    return fail(
      req,
      area,
      "Esta conta não é de Filho de Santo. Use a marcação pública ou outra aba.",
    );
  }

  if (!masterPai && area === "cliente" && filhoOk) {
    await supabase.auth.signOut();
    return fail(req, area, "Conta de Filho de Santo — entre em /entrar/filho.");
  }

  const baseProfile = {
    id: profile.id,
    full_name: profile.full_name ?? "",
    email: profile.email ?? email,
    role: profile.role as UserRole,
    person_kind: personKind,
    client_id: (profile as { client_id?: string | null }).client_id ?? undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies Profile;
  const acting = actingProfileForArea(baseProfile, masterPai ? area : null);

  const home = homePathForUser(acting);
  const redirect = NextResponse.redirect(new URL(home, origin));
  const res = client.applyCookies
    ? client.applyCookies(redirect)
    : withAuthCookies(cookieResponse(), redirect);
  res.cookies.set("ile-oloroke-sid", profile.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
  return setViewAsCookie(res, masterPai ? area : null);
}

function loginDemo(req: NextRequest, area: AreaSlug, email: string, password: string) {
  const roleRaw = authRoleForArea(area);

  if (password !== DEMO_PASSWORD) {
    return fail(req, area, "Senha inválida.");
  }

  const seed = createSeedState();
  const profile = seed.profiles.find((p) => p.email.toLowerCase() === email);

  if (!profile) {
    return fail(req, area, "E-mail não encontrado.");
  }

  const masterPai = paiCanOpenArea(profile.role);
  const filhoOk = isFilhoDeSanto(profile);

  if (!masterPai && profile.role !== roleRaw) {
    return fail(
      req,
      area,
      "Esta conta não tem acesso a esta área. Use o e-mail desta aba.",
    );
  }

  if (!masterPai && isFilhoArea(area) && !filhoOk) {
    return fail(
      req,
      area,
      "Esta conta não é de Filho de Santo. Use a marcação pública ou outra aba.",
    );
  }

  if (!masterPai && area === "cliente" && filhoOk) {
    return fail(req, area, "Conta de Filho de Santo — entre em /entrar/filho.");
  }

  const acting = actingProfileForArea(profile, masterPai ? area : null);
  return redirectWithDemoSession(
    req,
    profile.id,
    acting.role,
    acting.person_kind,
    masterPai ? area : null,
  );
}

/**
 * Login por área: e-mail + senha obrigatórios.
 * Com Supabase: Auth real. Sem env: modo demonstração.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const areaRaw = String(form.get("role") ?? "");
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!isAreaRole(areaRaw)) {
    return NextResponse.redirect(new URL("/", requestOrigin(req)));
  }

  if (!email || !password) {
    return fail(req, areaRaw, "Informe e-mail e senha.");
  }

  if (isSupabaseConfigured()) {
    return loginWithSupabase(req, areaRaw, email, password);
  }

  return loginDemo(req, areaRaw, email, password);
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
