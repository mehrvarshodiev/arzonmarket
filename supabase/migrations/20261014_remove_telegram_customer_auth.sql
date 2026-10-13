-- Remove Telegram customer-login storage while preserving the Telegram product-admin bot.
-- Apply in Supabase SQL Editor after deploying the code changes.
begin;

drop table if exists public.telegram_widget_auth_replays cascade;
drop table if exists public.auth_sessions cascade;
drop table if exists public.telegram_login_challenges cascade;

alter table public.users drop constraint if exists users_phone_or_telegram;
delete from public.users where phone is null;
drop index if exists public.users_telegram_id_unique;

alter table public.users
  drop column if exists telegram_username,
  drop column if exists telegram_photo_url,
  drop column if exists telegram_first_name,
  drop column if exists telegram_last_name,
  drop column if exists telegram_id;

alter table public.users
  add constraint users_phone_required check (phone is not null);

commit;
