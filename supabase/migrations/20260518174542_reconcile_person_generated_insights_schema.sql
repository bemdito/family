-- Reconcile local migration history with existing remote schema for 7.2 generated person insights.
-- The table already exists in the remote project. This migration is intentionally idempotent.

create table if not exists public.person_generated_insights (
  id uuid primary key,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  tipo text not null,
  data_nascimento text not null,
  conteudo jsonb not null,
  modelo text,
  prompt_version text not null,
  status text not null,
  error_message text,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

do $$
begin
  alter table public.person_generated_insights
    add constraint person_generated_insights_pessoa_id_fkey
    foreign key (pessoa_id)
    references public.pessoas(id)
    on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.person_generated_insights
    add constraint person_generated_insights_status_check
    check (status = any (array['pending'::text, 'completed'::text, 'error'::text]));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.person_generated_insights
    add constraint person_generated_insights_tipo_check
    check (tipo = any (array['astrology'::text, 'historical_events'::text]));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.person_generated_insights
    add constraint person_generated_insights_unique
    unique (pessoa_id, tipo);
exception
  when duplicate_object then null;
end $$;

alter table public.person_generated_insights enable row level security;

do $$
begin
  create policy "Authenticated users can read generated insights"
  on public.person_generated_insights
  for select
  to authenticated
  using (true);
exception
  when duplicate_object then null;
end $$;