-- Destinatários da notificação (perfis / abas)

alter table public.notifications
  add column if not exists audience public.user_role[];
