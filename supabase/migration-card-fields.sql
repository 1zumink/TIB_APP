-- ============================================================
-- TIB — миграция под карточку TIB_ID
-- Supabase Dashboard → SQL Editor → New query → вставь → Run
-- Идемпотентно: можно прогонять повторно.
--
-- Без неё профиль не сохраняется: приложение шлёт колонки,
-- которых в таблице ещё нет, и запрос отклоняется целиком.
-- ============================================================

alter table public.profiles add column if not exists first_name     text not null default '';
alter table public.profiles add column if not exists last_name      text not null default '';
alter table public.profiles add column if not exists role_secondary text not null default '';
alter table public.profiles add column if not exists phone          text not null default '';
alter table public.profiles add column if not exists website        text not null default '';
alter table public.profiles add column if not exists handle         text not null default '';
alter table public.profiles add column if not exists photo_url      text;
alter table public.profiles add column if not exists signature      text not null default 'ilya';

-- Разложить уже записанные имена на имя и фамилию (только там, где пусто).
update public.profiles
   set first_name = split_part(name, ' ', 1),
       last_name  = coalesce(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), '')
 where first_name = '' and name is not null and name <> '';

-- Проверка: должны появиться все колонки ниже.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
 order by ordinal_position;
