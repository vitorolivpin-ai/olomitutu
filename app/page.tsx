import { HubLanding } from "@/components/hub/hub-landing";

/**
 * Hub: emblema + atalhos públicos visíveis + menu (público e restrito).
 */
export default function HubPage() {
  return (
    <HubLanding
      entries={[
        {
          id: "marcar",
          label: "Marcar horário",
          hint: "Sem criar conta · Pix · ficha só o Pai vê",
          href: "/marcar",
          section: "geral",
        },
        {
          id: "biblioteca",
          label: "Biblioteca",
          hint: "Cantigas, vídeos e PDFs — sem login",
          href: "/acervo",
          section: "geral",
        },
        {
          id: "loja",
          label: "Loja",
          hint: "Produtos e Pix — sem login",
          href: "/vitrine",
          section: "geral",
        },
        {
          id: "historia",
          label: "Quem somos",
          hint: "História da casa",
          href: "/historia",
          section: "geral",
        },
        {
          id: "casa",
          label: "App da Casa",
          hint: "Login do Pai de Santo",
          href: "/entrar/pai_de_santo",
          section: "restrito",
        },
        {
          id: "filho",
          label: "Filho de Santo",
          hint: "Mensalidade, educação, ajodun…",
          href: "/entrar/filho",
          section: "restrito",
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
          id: "biblioteca_equipe",
          label: "Biblioteca (equipe)",
          hint: "Publicar materiais",
          href: "/entrar/biblioteca",
          section: "restrito",
        },
      ]}
    />
  );
}
