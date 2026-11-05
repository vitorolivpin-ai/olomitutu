# ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ

Gestão e organização do barracão.

## Demo local (MVP)

O app roda em modo demonstração com dados fictícios no navegador (localStorage). Não precisa de Supabase para navegar.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

**Senha demo de todas as áreas:** `demo123`

Contas:

| Área | E-mail |
|------|--------|
| Pai de Santo | pai@ileoloroke.demo |
| Cliente | cliente@ileoloroke.demo |
| Administrador | admin@ileoloroke.demo |
| Financeiro | tesouraria@ileoloroke.demo |
| Estoque | estoque@ileoloroke.demo |
| Biblioteca | biblioteca@ileoloroke.demo |

## Supabase (produção)

1. Crie um projeto no Supabase.
2. Rode as migrations em `supabase/migrations/`.
3. Copie `.env.example` para `.env.local` e preencha as chaves públicas.

## Stack

Next.js · TypeScript · Tailwind CSS · Supabase (preparado) · lucide-react
