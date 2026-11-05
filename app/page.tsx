import { HubLanding } from "@/components/hub/hub-landing";

/**
 * Hub: emblema + menu.
 * Cada entrada abre o login só daquela área (e-mail + senha).
 */
export default function HubPage() {
  return (
    <HubLanding
      entries={[
        {
          id: "casa",
          label: "App da Casa",
          hint: "Login do Pai de Santo",
          href: "/entrar/pai_de_santo",
          section: "geral",
        },
        {
          id: "cliente",
          label: "App do Cliente",
          hint: "Login do cliente",
          href: "/entrar/cliente",
          section: "geral",
        },
        {
          id: "admin",
          label: "Administrador",
          hint: "Login restrito",
          href: "/entrar/administrador",
          section: "restrito",
        },
        {
          id: "financeiro",
          label: "Financeiro",
          hint: "Login restrito",
          href: "/entrar/tesouraria",
          section: "restrito",
        },
        {
          id: "estoque",
          label: "Estoque",
          hint: "Login restrito",
          href: "/entrar/estoque",
          section: "restrito",
        },
        {
          id: "biblioteca",
          label: "Biblioteca",
          hint: "Login restrito",
          href: "/entrar/biblioteca",
          section: "restrito",
        },
      ]}
    />
  );
}
