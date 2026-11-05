import type {
  AjodunEvent,
  BlogPost,
  ChecklistItem,
  ChecklistProgress,
  EducationItem,
  HierarchyPerson,
  PhotoAlbum,
} from "@/types";

export function createHouseContentSeed(now: Date) {
  const iso = now.toISOString();
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

  const blogPosts: BlogPost[] = [
    {
      id: "blog_1",
      title: "A fundação do ILÉ OLÓRÒKÈ ÀṢẸ",
      excerpt: "Como a casa nasceu e o sentido do nome OLÓMÌ TÚTÙ.",
      body: `A casa ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ nasceu do desejo de cuidar com responsabilidade, axé e organização.

Este texto é um modelo editável: o Pai de Santo pode reescrever a história oficial, incluir datas, linhagem e memórias importantes.

Use a Biblioteca e a galeria de Fotos para complementar o que for contado aqui.`,
      category: "historia_casa",
      author_name: "Pai de Santo",
      published: true,
      created_at: ago(72),
      updated_at: ago(72),
    },
    {
      id: "blog_2",
      title: "Caminho do Pai de Santo",
      excerpt: "Uma apresentação pessoal — troque pelo relato real.",
      body: `Este espaço é para a história de quem conduz a casa: iniciação, mestres, aprendizados e o compromisso com a comunidade.

Edite este post no app para deixar a voz verdadeira do Pai / Mãe de Santo.`,
      category: "historia_pai",
      author_name: "Pai de Santo",
      published: true,
      created_at: ago(48),
      updated_at: ago(48),
    },
  ];

  const educationItems: EducationItem[] = [
    {
      id: "edu_1",
      title: "Introdução ao candomblé (vídeo de referência)",
      description: "Substitua pelo material indicado pela casa.",
      kind: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      author_or_source: "Referência demo",
      published: true,
      created_at: ago(40),
      updated_at: ago(40),
    },
    {
      id: "edu_2",
      title: "Sugestão de leitura",
      description: "Liste aqui os livros recomendados aos abians e iniciados.",
      kind: "livro",
      author_or_source: "Acervo da casa",
      published: true,
      created_at: ago(30),
      updated_at: ago(30),
    },
    {
      id: "edu_3",
      title: "Podcast / conversa (exemplo)",
      kind: "podcast",
      url: "https://open.spotify.com",
      published: true,
      created_at: ago(20),
      updated_at: ago(20),
    },
  ];

  const hierarchyPeople: HierarchyPerson[] = [
    {
      id: "hier_pai",
      full_name: "Pai de Santo",
      office: "pai_de_santo",
      bio: "Condução espiritual da casa.",
      parent_id: null,
      sort_order: 0,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "hier_mae",
      full_name: "Mãe Pequena (exemplo)",
      office: "mae_pequena",
      parent_id: "hier_pai",
      sort_order: 1,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "hier_ogan",
      full_name: "Ogã (exemplo)",
      office: "ogan",
      parent_id: "hier_pai",
      sort_order: 2,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "hier_ekeji",
      full_name: "Ekedi (exemplo)",
      office: "ekeji",
      parent_id: "hier_mae",
      sort_order: 3,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "hier_egbomi",
      full_name: "Egbomi (exemplo)",
      office: "egbomi",
      parent_id: "hier_mae",
      sort_order: 4,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "hier_abian",
      full_name: "Abian (exemplo)",
      office: "abian",
      parent_id: "hier_egbomi",
      sort_order: 5,
      created_at: iso,
      updated_at: iso,
    },
  ];

  const checklistItems: ChecklistItem[] = [
    {
      id: "chk_abian_1",
      level: "abian",
      topic: "vestimentas",
      title: "Roupas brancas e postura no barracão",
      body: "Explique o que o abian deve vestir, quando e por quê. Texto 100% editável.",
      sort_order: 1,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "chk_abian_2",
      level: "abian",
      topic: "geral",
      title: "Horários, silêncio e respeito",
      body: "Regras básicas de convivência para quem está chegando.",
      sort_order: 2,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "chk_inic_1",
      level: "iniciado",
      topic: "igba",
      title: "Cuidados com igba",
      body: "Orientações sobre igba — edite conforme a tradição da casa.",
      sort_order: 1,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "chk_inic_2",
      level: "iniciado",
      topic: "ebo",
      title: "Participação em ebó",
      body: "O que o iniciado precisa saber antes e depois do ebó.",
      sort_order: 2,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "chk_egb_1",
      level: "egbomi",
      topic: "geral",
      title: "Responsabilidades de egbomi",
      body: "Checklist de deveres e cuidados esperados neste nível.",
      sort_order: 1,
      created_at: iso,
      updated_at: iso,
    },
    {
      id: "chk_ogan_1",
      level: "ogan_ekeji_oloye_ajoye",
      topic: "geral",
      title: "Funções de Ogã / Ekedi / Oloyê / Ajoyê",
      body: "Descreva o papel de cada cargo e o que não pode faltar no dia a dia.",
      sort_order: 1,
      created_at: iso,
      updated_at: iso,
    },
  ];

  const ajodunEvents: AjodunEvent[] = [
    {
      id: "ajo_1",
      title: "Ajodun de exemplo",
      theme: "Organização geral da festa",
      scheduled_at: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString(),
      notes:
        "Base inicial. Depois alinhamos o molde completo da planilha e os itens personalizados de cada ajodun.",
      sheet_url: "https://docs.google.com/spreadsheets/",
      tasks: [
        { id: "t1", label: "Definir data e horário", done: true },
        { id: "t2", label: "Lista de compras / oferendas", done: false },
        { id: "t3", label: "Equipe de limpeza e organização", done: false },
        { id: "t4", label: "Controle de gastos (planilha compartilhada)", done: false },
        { id: "t5", label: "Comunicar a comunidade", done: false },
      ],
      published: true,
      created_at: ago(10),
      updated_at: ago(10),
    },
  ];

  const photoAlbums: PhotoAlbum[] = [
    {
      id: "alb_1",
      title: "Memórias do barracão",
      description: "Álbum demo — troque pelas fotos reais ou pelo link do Drive.",
      drive_url: "https://drive.google.com",
      photos: [
        {
          id: "ph1",
          url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
          caption: "Exemplo de registro",
        },
        {
          id: "ph2",
          url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
          caption: "Exemplo de celebração",
        },
      ],
      published: true,
      created_at: ago(5),
      updated_at: ago(5),
    },
  ];

  return {
    blogPosts,
    educationItems,
    hierarchyPeople,
    checklistItems,
    checklistProgress: [] as ChecklistProgress[],
    ajodunEvents,
    photoAlbums,
  };
}
