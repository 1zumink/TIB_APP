-- ============================================================
-- TIB — Supabase schema
-- Прогони этот файл целиком: Supabase Dashboard → SQL Editor → New query → вставь → Run
-- Идемпотентно: можно запускать повторно.
-- ============================================================

-- Автоматическая нумерация карточек TIB-001, TIB-002, ...
create sequence if not exists tib_code_seq start 1;

-- ---------- Профили (по одному на пользователя из auth) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  first_name text not null default '',
  last_name  text not null default '',
  role       text not null default 'Designer',
  role_secondary text not null default '',
  code       text not null default ('TIB-' || lpad(nextval('tib_code_seq')::text, 3, '0')),
  color      text not null default '#FF0044',
  phone      text not null default '',
  website    text not null default '',
  handle     text not null default '',
  photo_url  text,
  signature  text not null default 'ilya',
  created_at timestamptz not null default now()
);

-- Карточка TIB_ID: поля, добавленные после первой версии схемы.
-- Отдельными ALTER, чтобы прогон на уже существующей базе ничего не сломал.
alter table public.profiles add column if not exists first_name text not null default '';
alter table public.profiles add column if not exists last_name  text not null default '';
alter table public.profiles add column if not exists role_secondary text not null default '';
alter table public.profiles add column if not exists phone      text not null default '';
alter table public.profiles add column if not exists website    text not null default '';
alter table public.profiles add column if not exists handle     text not null default '';
alter table public.profiles add column if not exists photo_url  text;
alter table public.profiles add column if not exists signature  text not null default 'ilya';

-- Разложить уже записанные имена на имя и фамилию (только там, где пусто).
update public.profiles
   set first_name = split_part(name, ' ', 1),
       last_name  = coalesce(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), '')
 where first_name = '' and name is not null and name <> '';

-- ---------- Дедлайны ----------
create table if not exists public.deadlines (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  project    text not null default '',
  date       date not null,
  owner_id   uuid references public.profiles(id) on delete set null,
  status     text not null default 'active',
  created_at timestamptz not null default now()
);

-- ---------- Общие часы работы ----------
create table if not exists public.work_hours (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  weekday    int  not null,           -- 0=Вс ... 6=Сб
  start_time text not null,           -- "18:00"
  end_time   text not null,           -- "21:00"
  attendees  uuid[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null
);

-- ---------- Таски ----------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  date        date,
  status      text not null default 'open',   -- open | claimed | done
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- Ивенты ----------
create table if not exists public.events (
  id       uuid primary key default gen_random_uuid(),
  title    text not null,
  kind     text not null default 'Митап',
  date     date not null,
  location text not null default '',
  added_by uuid references public.profiles(id) on delete set null,
  going    uuid[] not null default '{}'
);

-- ---------- Лог работ ----------
create table if not exists public.journal (
  id          uuid primary key default gen_random_uuid(),
  description text not null,
  author_id   uuid references public.profiles(id) on delete set null,
  at          timestamptz not null default now(),
  project     text
);

-- ============================================================
-- Row Level Security
-- Небольшая доверенная команда: любой залогиненный видит и меняет общие данные.
-- Профиль каждый редактирует только свой; видят все.
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.deadlines  enable row level security;
alter table public.work_hours enable row level security;
alter table public.tasks      enable row level security;
alter table public.events     enable row level security;
alter table public.journal      enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid());

-- Общие таблицы: полный доступ залогиненным
do $$
declare t text;
begin
  foreach t in array array['deadlines','work_hours','tasks','events','journal']
  loop
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format(
      'create policy %I_all on public.%I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

-- ============================================================
-- Realtime — чтобы изменения прилетали всем мгновенно
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','deadlines','work_hours','tasks','events','journal']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
