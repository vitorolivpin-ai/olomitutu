# ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ

Gestão e organização do barracão.

## Demo local (MVP)

O app roda em modo demonstração com dados fictícios no navegador (localStorage) quando o Supabase **não** está configurado.

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

## Supabase Auth (produção)

Cadastro, login e recuperação de senha usam Supabase Auth. Os demais dados do MVP ainda ficam no localStorage.

### 1. Criar o projeto

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode as migrations em `supabase/migrations/` **na ordem** (`001` … `012`).
3. Em **Project Settings → API**, copie **Project URL** e **anon public** key.

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

No Vercel: **Settings → Environment Variables** com as mesmas chaves → Redeploy.

### 3. URLs de Auth

Em **Authentication → URL Configuration**:

- **Site URL:** URL do Vercel (ex.: `https://seu-app.vercel.app`)
- **Redirect URLs:**
  - `http://localhost:3000/**`
  - `https://seu-app.vercel.app/**`
  - `https://seu-app.vercel.app/auth/callback`

### 4. E-mail (recuperação de senha)

Em **Authentication → Emails / SMTP**:

1. Crie um remetente dedicado (ex.: `noreply@seudominio.com`).
2. Configure SMTP (Resend, Brevo, SendGrid ou Gmail com senha de app).
3. Sem SMTP customizado o e-mail padrão do Supabase serve só para testes.

### 5. Contas e papéis

- **Auto-cadastro** (`/cadastrar`): sempre cria perfil com role `cliente`.
- **Staff** (pai de santo, admin, tesouraria, estoque, biblioteca):
  1. Crie o usuário em **Authentication → Users**.
  2. Em **Table Editor → profiles**, ajuste a coluna `role`.

### 6. Conferir

1. Cadastre um cliente → entre em `/entrar/cliente`.
2. Use **Esqueci a senha** e confirme o e-mail.
3. No Menu, o backend deve mostrar “Supabase configurado”.

## Stack

Next.js · TypeScript · Tailwind CSS · Supabase Auth · lucide-react
