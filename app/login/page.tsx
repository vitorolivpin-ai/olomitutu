import { redirect } from "next/navigation";

/**
 * Login genérico antigo → volta ao hub.
 * Cada área tem seu próprio /entrar/[role].
 */
export default function LoginPage() {
  redirect("/");
}
