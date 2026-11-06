import type {
  BlogPostCategory,
  ChecklistLevel,
  ChecklistTopic,
  EducationKind,
  HouseOffice,
} from "@/types";

export const BLOG_CATEGORY_LABEL: Record<BlogPostCategory, string> = {
  historia_casa: "História da casa",
  historia_pai: "História do Pai / Mãe",
  pessoa: "Pessoas",
  outro: "Outros",
};

export const EDUCATION_KIND_LABEL: Record<EducationKind, string> = {
  livro: "Livro",
  video: "Vídeo",
  filme: "Filme",
  podcast: "Podcast",
};

export const OFFICE_LABEL: Record<HouseOffice, string> = {
  pai_de_santo: "Pai / Mãe de Santo",
  mae_pequena: "Mãe / Pai Pequeno(a)",
  ogan: "Ogã",
  ekeji: "Ekedi",
  oloye: "Oloyê",
  ajoye: "Ajoyê",
  egbomi: "Egbomi",
  iniciado: "Iniciado(a)",
  abian: "Abian",
  outro: "Outro",
};

/** Cor do anel ao redor da foto no organograma */
export const OFFICE_RING: Record<HouseOffice, string> = {
  pai_de_santo: "#c9a227",
  mae_pequena: "#8b5a2b",
  ogan: "#1f4e79",
  ekeji: "#6b2d5c",
  oloye: "#2f6f4e",
  ajoye: "#b45309",
  egbomi: "#4c1d95",
  iniciado: "#334155",
  abian: "#64748b",
  outro: "#94a3b8",
};

export const CHECKLIST_LEVEL_LABEL: Record<ChecklistLevel, string> = {
  abian: "Abian",
  iniciado: "Iniciado",
  egbomi: "Egbomi",
  ogan_ekeji_oloye_ajoye: "Ogã / Ekedi / Oloyê / Ajoyê",
};

export const CHECKLIST_TOPIC_LABEL: Record<ChecklistTopic, string> = {
  vestimentas: "Vestimentas",
  ebo: "Ebó",
  igba: "Igba",
  geral: "Geral",
  outro: "Outro",
};

export const CONTENT_SECTIONS = [
  {
    href: "/quem-somos",
    title: "Quem somos",
    blurb: "História da casa e das pessoas — em formato de mini-blog.",
  },
  {
    href: "/educacao",
    title: "Educação",
    blurb: "Livros, vídeos, filmes e podcasts sobre candomblé.",
  },
  {
    href: "/hierarquia",
    title: "Hierarquia",
    blurb: "Organograma do barracão com fotos e cargos.",
  },
  {
    href: "/checklist",
    title: "Checklist",
    blurb: "O que saber ao chegar — por nível (Abian → cargos).",
  },
  {
    href: "/ajodun",
    title: "Ajodun",
    blurb: "Organização, tarefas e planilha compartilhada.",
  },
  {
    href: "/fotos",
    title: "Fotos",
    blurb: "Memórias do barracão e links de Drive.",
  },
  {
    href: "/loja",
    title: "Loja",
    blurb: "Produtos à venda no App do Cliente.",
  },
] as const;
