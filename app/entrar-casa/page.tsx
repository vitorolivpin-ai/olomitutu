import { redirect } from "next/navigation";

/** Atalho antigo → login só da Casa */
export default function EntrarCasaRedirect() {
  redirect("/entrar/pai_de_santo");
}
