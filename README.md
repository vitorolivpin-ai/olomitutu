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

- **Site URL:** `https://olomitutu.vercel.app` (não use localhost aqui)
- **Redirect URLs:**
  - `https://olomitutu.vercel.app/**`
  - `https://olomitutu.vercel.app/auth/callback`
  - `http://localhost:3000/**` (só para testar no PC)

No Vercel, adicione também `NEXT_PUBLIC_SITE_URL=https://olomitutu.vercel.app`.

### 4. E-mail de confirmação / senha (obrigatório em produção)

Sem **SMTP próprio**, o Supabase **não entrega** e-mail de cadastro para o público — só para membros da equipe do projeto (e com limite baixo). Por isso “não chega o e-mail” ao criar conta.

Em **Authentication → SMTP** (ou Emails):

1. Use Resend, Brevo, SendGrid ou similar.
2. Remetente verificado (ex.: `noreply@seudominio.com`).
3. Host/porta/usuário/senha SMTP do provedor.
4. Em **Authentication → Providers → Email**, deixe **Confirm email** ligado (ou, só em teste, confirme o usuário em **Authentication → Users**).

Enquanto o SMTP não estiver ok: Authentication → Users → usuário → **Confirm email** manual.

### 5. Contas e papéis

- **Cadastro nas abas** Admin, Estoque, Financeiro e Biblioteca: a **aba** define o papel liberado (estoque, biblioteca…). O tipo (Filho de Santo / Cliente / Admin) é só referência para o Pai.
- Fica **pendente** até o **Pai de Santo** aceitar em **Cadastros pendentes** (`/cadastros`).
- Rode as migrations `013`–`015` e **`022_signup_role_from_tab.sql`** (corrige contas gravadas como `cliente` por engano).
- Loja digital / Pix / liberações: rode **`021_house_content_sync.sql`**, **`023_shop_digital.sql`**. Se salvar produto falhar, rode **`024_shop_repair.sql`**.
- O primeiro Pai de Santo pode ser liberado no painel (`role = pai_de_santo`, `approval_status = approved`).

### 6. Google Calendar (App → Google)

1. No [Google Cloud Console](https://console.cloud.google.com/): crie um projeto → ative **Google Calendar API**.
2. **APIs & Services → Credentials → Create OAuth client ID** (Web application).
3. Authorized redirect URI: `https://olomitutu.vercel.app/api/google/callback`
4. No Vercel, adicione:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://olomitutu.vercel.app/api/google/callback`
   - `SUPABASE_SERVICE_ROLE_KEY` (legacy service_role do Supabase)
5. No Supabase SQL Editor, rode `016_google_calendar.sql`.
6. No app: entre como Pai → **Agenda** → **Conectar Google Calendar**.
7. Novos agendamentos (e cancelamentos) sincronizam para a agenda Google do Pai.

### 6. Conferir

1. Cadastre um cliente → entre em `/entrar/cliente`.
2. Use **Esqueci a senha** e confirme o e-mail.
3. No Menu, o backend deve mostrar “Supabase configurado”.

## Stack

Next.js · TypeScript · Tailwind CSS · Supabase Auth · lucide-react
