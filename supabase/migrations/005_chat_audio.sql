-- Mensagens de áudio no chat

alter table public.messages
  add column if not exists kind text not null default 'text'
    check (kind in ('text', 'audio'));

alter table public.messages
  add column if not exists audio_url text;

alter table public.messages
  add column if not exists audio_duration_sec numeric(8,2);

-- No demo local o áudio fica em data URL; em produção use Storage e salve a URL em audio_url.
