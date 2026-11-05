import { redirect } from "next/navigation";

/** Atalho antigo → login só do Cliente */
export default function EntrarClienteRedirect() {
  redirect("/entrar/cliente");
}
