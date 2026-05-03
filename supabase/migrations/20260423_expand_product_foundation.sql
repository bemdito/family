-- =====================================================
-- EXPANSÃO DA FUNDAÇÃO DO PRODUTO - ÁRVORE FAMILIAR
-- Data: 2026-04-23
-- Objetivo: preparar autenticação real, favoritos, notificações,
-- eventos familiares e vínculo entre usuário e pessoa.
-- =====================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- AMPLIAÇÃO DA TABELA PESSOAS
-- =====================================================
alter table if exists pessoas
  add column if not exists instagram_usuario varchar(255),
  add column if not exists instagram_url text,
  add column if not exists permitir_exibir_instagram boolean default false,
  add column if not exists permitir_mensagens_whatsapp boolean default false,
  add column if not exists geracao_sociologica varchar(80),
  add column if not exists lado varchar(20) default 'esquerda',
  add column if not exists manual_generation smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pessoas_lado_check'
  ) then
    alter table pessoas
      add constraint pessoas_lado_check
      check (lado in ('esquerda', 'direita'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pessoas_manual_generation_range'
  ) then
    alter table pessoas
      add constraint pessoas_manual_generation_range
      check (manual_generation is null or manual_generation between 1 and 7);
  end if;
end $$;

create index if not exists idx_pessoas_geracao_sociologica on pessoas(geracao_sociologica);
create index if not exists idx_pessoas_instagram_usuario on pessoas(instagram_usuario);
create index if not exists idx_pessoas_lado on pessoas(lado);
create index if not exists idx_pessoas_manual_generation on pessoas(manual_generation);

-- =====================================================
-- PERFIS DE USUÁRIO
-- =====================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_exibicao varchar(255),
  avatar_url text,
  role varchar(30) not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_role on profiles(role);

-- =====================================================
-- VÍNCULO ENTRE USUÁRIO E PESSOA DA ÁRVORE
-- =====================================================
create table if not exists user_person_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  relacao_com_perfil varchar(100),
  principal boolean not null default true,
  created_at timestamptz default now(),
  unique(user_id, pessoa_id)
);

create index if not exists idx_user_person_links_user on user_person_links(user_id);
create index if not exists idx_user_person_links_pessoa on user_person_links(pessoa_id);

-- =====================================================
-- FAVORITOS
-- =====================================================
create table if not exists user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo_conteudo varchar(40) not null check (tipo_conteudo in ('pessoa', 'arquivo', 'topico', 'evento', 'pagina', 'historia')),
  conteudo_id varchar(255) not null,
  titulo varchar(255),
  created_at timestamptz default now(),
  unique(user_id, tipo_conteudo, conteudo_id)
);

create index if not exists idx_user_favorites_user on user_favorites(user_id);
create index if not exists idx_user_favorites_tipo on user_favorites(tipo_conteudo);

-- =====================================================
-- PREFERÊNCIAS DE NOTIFICAÇÃO
-- =====================================================
create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  receber_aniversarios boolean not null default true,
  receber_datas_memoria boolean not null default true,
  receber_eventos boolean not null default true,
  receber_avisos_gerais boolean not null default true,
  receber_email boolean not null default false,
  receber_push boolean not null default false,
  receber_whatsapp boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- NOTIFICAÇÕES
-- =====================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo varchar(255) not null,
  mensagem text not null,
  tipo varchar(40) not null default 'notificacao',
  canal varchar(20) not null default 'interna' check (canal in ('interna', 'email', 'push', 'whatsapp')),
  lida boolean not null default false,
  link text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_lida on notifications(lida);
create index if not exists idx_notifications_tipo on notifications(tipo);

-- =====================================================
-- EVENTOS DA FAMÍLIA
-- =====================================================
create table if not exists family_events (
  id uuid primary key default gen_random_uuid(),
  titulo varchar(255) not null,
  descricao text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  local varchar(255),
  tipo varchar(30) not null default 'outro' check (tipo in ('aniversario', 'memoria', 'encontro', 'aviso', 'outro')),
  pessoa_relacionada_id uuid references pessoas(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_family_events_data_inicio on family_events(data_inicio);
create index if not exists idx_family_events_tipo on family_events(tipo);

create table if not exists event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references family_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status varchar(20) not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'tentative')),
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

create index if not exists idx_event_attendees_event on event_attendees(event_id);
create index if not exists idx_event_attendees_user on event_attendees(user_id);

-- =====================================================
-- TRIGGERS DE UPDATED_AT
-- =====================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
create trigger update_profiles_updated_at
before update on profiles
for each row
execute function update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
create trigger update_notification_preferences_updated_at
before update on notification_preferences
for each row
execute function update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_events_updated_at ON family_events;
create trigger update_family_events_updated_at
before update on family_events
for each row
execute function update_updated_at_column();

-- =====================================================
-- RLS
-- =====================================================
alter table profiles enable row level security;
alter table user_person_links enable row level security;
alter table user_favorites enable row level security;
alter table notification_preferences enable row level security;
alter table notifications enable row level security;
alter table family_events enable row level security;
alter table event_attendees enable row level security;

-- Profiles
create policy "users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "admins can read all profiles"
  on profiles for select
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- User-person links
create policy "users can read own links"
  on user_person_links for select
  using (auth.uid() = user_id);

create policy "users can manage own links"
  on user_person_links for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Favorites
create policy "users can read own favorites"
  on user_favorites for select
  using (auth.uid() = user_id);

create policy "users can manage own favorites"
  on user_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notification preferences
create policy "users can read own notification preferences"
  on notification_preferences for select
  using (auth.uid() = user_id);

create policy "users can manage own notification preferences"
  on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications
create policy "users can read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "users can update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- Family events
create policy "authenticated users can read family events"
  on family_events for select
  using (auth.uid() is not null);

create policy "authenticated users can create family events"
  on family_events for insert
  with check (auth.uid() is not null);

create policy "creators or admins can update family events"
  on family_events for update
  using (
    auth.uid() = created_by
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Event attendees
create policy "users can read own attendance"
  on event_attendees for select
  using (auth.uid() = user_id);

create policy "users can manage own attendance"
  on event_attendees for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
