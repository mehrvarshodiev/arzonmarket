-- ArzonMarket Supabase schema
-- Run this file in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 180),
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  category text not null check (char_length(category) between 1 and 80),
  brand text not null check (char_length(brand) between 1 and 80),
  images text[] not null default '{}',
  specs jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_created_idx on public.products (category, created_at desc);
create index if not exists products_featured_created_idx on public.products (featured desc, created_at desc);
create index if not exists products_active_idx on public.products (is_active);

alter table public.products enable row level security;
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select to anon, authenticated
  using (is_active = true);

-- Telegram wizard state is server-only. Never add anon/authenticated policies here.
create table if not exists public.telegram_product_drafts (
  telegram_user_id bigint primary key,
  step text not null,
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.telegram_product_drafts enable row level security;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null default '',
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'new' check (status in ('new','confirmed','processing','shipped','completed','cancelled')),
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
-- Orders intentionally have no public read/write policies; backend must validate and insert orders.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
