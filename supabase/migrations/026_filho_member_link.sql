-- Vínculo membro financeiro ↔ perfil (filho de santo) + nível de checklist

alter table public.members
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

alter table public.members
  add column if not exists checklist_level text;

create unique index if not exists members_profile_id_uidx
  on public.members (profile_id)
  where profile_id is not null;

comment on column public.members.profile_id is
  'Perfil Auth do filho de santo vinculado a este cadastro de mensalidade';
comment on column public.members.checklist_level is
  'Nível do checklist (abian, iniciado, egbomi, ogan_ekeji_oloye_ajoye)';
