create table if not exists public.person_events (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  tipo text not null default 'outro',
  titulo text not null,
  data_evento text null,
  local text null,
  descricao text null,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_person_events_pessoa_id
  on public.person_events (pessoa_id);

create index if not exists idx_person_events_pessoa_id_ordem
  on public.person_events (pessoa_id, ordem);

create index if not exists idx_person_events_pessoa_id_data_evento
  on public.person_events (pessoa_id, data_evento);

drop trigger if exists update_person_events_updated_at on public.person_events;

create trigger update_person_events_updated_at
before update on public.person_events
for each row
execute function public.update_updated_at_column();

alter table public.person_events enable row level security;

drop policy if exists "authenticated users can read person events" on public.person_events;
create policy "authenticated users can read person events"
on public.person_events
for select
to authenticated
using (true);

drop policy if exists "admins can insert person events" on public.person_events;
create policy "admins can insert person events"
on public.person_events
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can update person events" on public.person_events;
create policy "admins can update person events"
on public.person_events
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can delete person events" on public.person_events;
create policy "admins can delete person events"
on public.person_events
for delete
to authenticated
using (public.is_admin_user(auth.uid()));

-- TODO: liberar escrita para usuarios vinculados quando a regra de moderacao dos eventos proprios estiver definida.
