export type HubEntry = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  section?: "geral" | "restrito";
};

/** Entradas do hub público / menu Perfil (rotas existentes). */
export const HUB_ENTRIES: HubEntry[] = [
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
    hint: "Acesso completo · Pai de Santo",
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
    id: "cliente",
    label: "Cliente",
    hint: "Cursos, agenda e chat — com conta",
    href: "/entrar/cliente",
    section: "restrito",
  },
  {
    id: "admin",
    label: "Administrador",
    hint: "Filhos, avisos, ajodun e loja",
    href: "/entrar/administrador",
    section: "restrito",
  },
  {
    id: "financeiro",
    label: "Financeiro",
    hint: "Finanças e loja",
    href: "/entrar/tesouraria",
    section: "restrito",
  },
  {
    id: "estoque",
    label: "Estoque",
    hint: "Código de barras",
    href: "/entrar/estoque",
    section: "restrito",
  },
  {
    id: "biblioteca_equipe",
    label: "Biblioteca (equipe)",
    hint: "Acervo da casa",
    href: "/entrar/biblioteca",
    section: "restrito",
  },
];
