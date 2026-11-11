-- Vincula appointments ao evento do Google Calendar do Pai

alter table if exists public.appointments
  add column if not exists google_event_id text;

comment on column public.appointments.google_event_id is
  'ID do evento no Google Calendar do Pai (preenchido na confirmação/aprovação).';
