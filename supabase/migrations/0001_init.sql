-- Loop dashboard: accounts, sessions and sign-in attempts.
-- Only the server (service role) touches these tables. Row level security is
-- enabled with no policies, so the public anon/authenticated roles get nothing.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  pin_index text not null unique,          -- HMAC of the PIN; the PIN itself is never stored
  key_fingerprint text not null unique,    -- HMAC of the API key
  key_ciphertext text not null,            -- AES-256-GCM encrypted API key
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token_hash text primary key,             -- SHA-256 of the cookie token
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists sessions_account_id_idx on public.sessions (account_id);

create table if not exists public.auth_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  kind text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_attempts_kind_created_idx on public.auth_attempts (kind, created_at);
create index if not exists auth_attempts_ip_created_idx on public.auth_attempts (ip_hash, created_at);

alter table public.accounts enable row level security;
alter table public.sessions enable row level security;
alter table public.auth_attempts enable row level security;

revoke all on public.accounts, public.sessions, public.auth_attempts from anon, authenticated;
