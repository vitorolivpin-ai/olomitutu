import { redirect } from "next/navigation";

/** Atalho antigo → cadastro do Cliente */
export default function CadastrarRedirectPage() {
  redirect("/cadastrar/cliente");
}
