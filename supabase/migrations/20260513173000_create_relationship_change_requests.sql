-- =====================================================
-- CREATE RELATIONSHIP CHANGE REQUESTS
-- Data: 2026-05-13
-- Objetivo: registrar solicitacoes de ajuste de vinculos para revisao admin.
-- =====================================================

create table if not exists public.relationship_change_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  action text not null,
  status text not null default 'pending',
  target_pessoa_id uuid references public.pessoas(id) on delete set null,
  related_pessoa_id uuid references public.pessoas(id) on delete set null,
  relationship_id uuid references public.relacionamentos(id) on delete set null,
  relationship_type text not null,
  relationship_subtype text,
  payload jsonb not null default '{}'::jsonb,
  admin_reviewed_by uuid references auth.users(id) on delete set null,
  admin_reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint relationship_change_requests_action_check
    check (action in ('create', 'update', 'delete')),

  constraint relationship_change_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),

  constraint relationship_change_requests_relationship_type_check
    check (relationship_type in ('conjuge', 'pai', 'mae', 'filho', 'irmao')),

  constraint relationship_change_requests_relationship_subtype_check
    check (
      relationship_subtype is null
      or relationship_subtype in ('sangue', 'adotivo', 'uniao', 'casamento', 'separado', 'uniao_estavel')
    )
);

create index if not exists idx_relationship_change_requests_requester_user_id
  on public.relationship_change_requests (requester_user_id);

create index if not exists idx_relationship_change_requests_requester_pessoa_id
  on public.relationship_change_requests (requester_pessoa_id);

create index if not exists idx_relationship_change_requests_status
  on public.relationship_change_requests (status);

create index if not exists idx_relationship_change_requests_action
  on public.relationship_change_requests (action);

create index if not exists idx_relationship_change_requests_relationship_type
  on public.relationship_change_requests (relationship_type);

create index if not exists idx_relationship_change_requests_created_at_desc
  on public.relationship_change_requests (created_at desc);

create index if not exists idx_relationship_change_requests_admin_reviewed_by
  on public.relationship_change_requests (admin_reviewed_by);

create index if not exists idx_relationship_change_requests_target_pessoa_id
  on public.relationship_change_requests (target_pessoa_id);

create index if not exists idx_relationship_change_requests_related_pessoa_id
  on public.relationship_change_requests (related_pessoa_id);

drop trigger if exists update_relationship_change_requests_updated_at
on public.relationship_change_requests;

create trigger update_relationship_change_requests_updated_at
before update on public.relationship_change_requests
for each row
execute function public.update_updated_at_column();

create or replace function public.guard_relationship_change_request_member_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin_user(auth.uid()) then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if old.requester_user_id <> auth.uid() then
    raise exception 'cannot update another user relationship change request';
  end if;

  if old.status <> 'pending' or new.status <> 'cancelled' then
    raise exception 'only pending requests can be cancelled by requester';
  end if;

  if
    new.id is distinct from old.id
    or new.requester_user_id is distinct from old.requester_user_id
    or new.requester_pessoa_id is distinct from old.requester_pessoa_id
    or new.action is distinct from old.action
    or new.target_pessoa_id is distinct from old.target_pessoa_id
    or new.related_pessoa_id is distinct from old.related_pessoa_id
    or new.relationship_id is distinct from old.relationship_id
    or new.relationship_type is distinct from old.relationship_type
    or new.relationship_subtype is distinct from old.relationship_subtype
    or new.payload is distinct from old.payload
    or new.admin_reviewed_by is distinct from old.admin_reviewed_by
    or new.admin_reviewed_at is distinct from old.admin_reviewed_at
    or new.admin_note is distinct from old.admin_note
    or new.created_at is distinct from old.created_at
  then
    raise exception 'requester can only change status to cancelled';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_relationship_change_request_member_update
on public.relationship_change_requests;

create trigger guard_relationship_change_request_member_update
before update on public.relationship_change_requests
for each row
execute function public.guard_relationship_change_request_member_update();

alter table public.relationship_change_requests enable row level security;

drop policy if exists "admins can read relationship change requests" on public.relationship_change_requests;
create policy "admins can read relationship change requests"
on public.relationship_change_requests
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "requesters can read own relationship change requests" on public.relationship_change_requests;
create policy "requesters can read own relationship change requests"
on public.relationship_change_requests
for select
to authenticated
using (requester_user_id = auth.uid());

drop policy if exists "requesters can create own relationship change requests" on public.relationship_change_requests;
create policy "requesters can create own relationship change requests"
on public.relationship_change_requests
for insert
to authenticated
with check (
  requester_user_id = auth.uid()
  and status = 'pending'
  and admin_reviewed_by is null
  and admin_reviewed_at is null
  and exists (
    select 1
    from public.user_person_links upl
    where upl.user_id = auth.uid()
      and upl.pessoa_id = requester_pessoa_id
  )
);

drop policy if exists "admins can update relationship change requests" on public.relationship_change_requests;
create policy "admins can update relationship change requests"
on public.relationship_change_requests
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "requesters can cancel pending relationship change requests" on public.relationship_change_requests;
create policy "requesters can cancel pending relationship change requests"
on public.relationship_change_requests
for update
to authenticated
using (
  requester_user_id = auth.uid()
  and status = 'pending'
)
with check (
  requester_user_id = auth.uid()
  and status = 'cancelled'
);
