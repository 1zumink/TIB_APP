-- ============================================================
-- TIB — хранилище для фото на карточке
-- Supabase Dashboard → SQL Editor → New query → вставь → Run
-- Идемпотентно: можно прогонять повторно.
--
-- Без неё фото не сохраняется: приложение грузит файл в бакет,
-- которого ещё нет, и получает ошибку.
-- ============================================================

-- Публичный бакет: карточку показывают и без логина, подписанные
-- ссылки протухают, а лица тут и так печатаются на пропуске.
insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', true)
on conflict (id) do update set public = true;

-- Читать — всем. Писать — только в свою папку: путь всегда
-- начинается с id пользователя (см. uploadPortrait в src/lib/photo.ts).
drop policy if exists "portraits read" on storage.objects;
create policy "portraits read" on storage.objects
  for select using (bucket_id = 'portraits');

drop policy if exists "portraits insert own" on storage.objects;
create policy "portraits insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "portraits update own" on storage.objects;
create policy "portraits update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "portraits delete own" on storage.objects;
create policy "portraits delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

-- Проверка: бакет и четыре политики.
select id, public from storage.buckets where id = 'portraits';
select policyname from pg_policies
 where schemaname = 'storage' and tablename = 'objects' and policyname like 'portraits%'
 order by policyname;
