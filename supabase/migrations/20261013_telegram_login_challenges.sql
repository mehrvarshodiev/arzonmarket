-- ArzonMarket: one-time Telegram deep-link login challenges.
-- Run once in Supabase SQL Editor before using Telegram login.
create table if not exists public.telegram_login_challenges (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  poll_token_hash text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','consumed','expired')),
  telegram_id text,
  telegram_name text,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists telegram_login_challenges_expiry_idx on public.telegram_login_challenges (expires_at);
alter table public.telegram_login_challenges enable row level security;
