-- ArzonMarket Telegram Login Widget profile metadata and revocable sessions.
-- Run this migration in the Supabase SQL Editor before enabling widget login.
alter table public.users
  add column if not exists telegram_username text,
  add column if not exists telegram_photo_url text,
  add column if not exists telegram_first_name text,
  add column if not exists telegram_last_name text,
  add column if not exists updated_at timestamptz;

-- Telegram ID must identify exactly one customer for safe upsert.
create unique index if not exists users_telegram_id_unique
  on public.users (telegram_id);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auth_sessions_user_id_idx on public.auth_sessions (user_id);
create index if not exists auth_sessions_expiry_idx on public.auth_sessions (expires_at);
alter table public.auth_sessions enable row level security;

-- Store a one-time fingerprint of each accepted widget signature to reject replayed payloads.
create table if not exists public.telegram_widget_auth_replays (
  signature_hash text primary key,
  auth_date timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists telegram_widget_auth_replays_created_idx
  on public.telegram_widget_auth_replays (created_at);
alter table public.telegram_widget_auth_replays enable row level security;
