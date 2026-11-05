import { NextRequest, NextResponse } from "next/server";
import { createSeedState, DEMO_PASSWORD } from "@/lib/seed";
import { homePathForRole } from "@/lib/navigation";
import { isAreaRole } from "@/lib/demo-accounts";
import type { UserRole } from "@/types";

function requestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

function redirectWithSession(req: NextRequest, userId: string, role: UserRole) {
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

function clearSid(res: NextResponse) {
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
  return clearSid(NextResponse.redirect(url));
}

/**
 * Login por área: e-mail + senha obrigatórios.
 * Só libera se a conta for daquela aba (role).
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

  return redirectWithSession(req, profile.id, roleRaw);
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
