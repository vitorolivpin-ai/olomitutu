-- Chat na nuvem: kinds vídeo/chamada, URLs, storage, realtime, cadastro do cliente

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  drop constraint if exists messages_kind_check1;

do $$
begin
  alter table public.messages
    add constraint messages_kind_check
    check (kind in ('text', 'audio', 'video', 'call'));
exception
  when duplicate_object then null;
end $$;

alter table public.messages add column if not exists video_url text;
alter table public.messages add column if not exists call_url text;

alter table public.clients add column if not exists birth_date date;
alter table public.clients add column if not exists registration_complete boolean not null default false;

insert into storage.buckets (id, name, public)
values ('chat', 'chat', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists chat_storage_select on storage.objects;
create policy chat_storage_select on storage.objects
for select using (bucket_id = 'chat');

drop policy if exists chat_storage_write on storage.objects;
create policy chat_storage_write on storage.objects
for all using (
  bucket_id = 'chat'
  and auth.uid() is not null
)
with check (
  bucket_id = 'chat'
  and auth.uid() is not null
);

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when undefined_table then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.clients;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when undefined_table then null;
end $$;
