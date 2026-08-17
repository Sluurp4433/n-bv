-- Extensions
create extension if not exists pg_trgm with schema extensions;

-- Enum för roller
do $$ begin
  create type public.user_role as enum ('medlem', 'admin');
exception when duplicate_object then null; end $$;

-- Normaliserar registreringsnummer: versaler, endast bokstäver/siffror
create or replace function public.normalize_regnr(input text)
returns text language sql immutable
set search_path = public, pg_temp
as $$
  select upper(regexp_replace(coalesce(input, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role public.user_role not null default 'medlem',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  retention_months integer not null default 12,
  edit_window_hours integer not null default 24,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null,
  registration_normalized text generated always as (
    upper(regexp_replace(coalesce(registration_number, ''), '[^A-Za-z0-9]', '', 'g'))
  ) stored,
  make text,
  model text,
  color text,
  vehicle_type text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_regnr_not_empty check (
    upper(regexp_replace(coalesce(registration_number, ''), '[^A-Za-z0-9]', '', 'g')) <> ''
  ),
  constraint vehicles_regnr_unique unique (registration_normalized)
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  observed_at timestamptz not null default now(),
  location text,
  category text,
  type text,
  description text,
  priority text not null default 'normal',
  notes text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('swedish',
      coalesce(description, '') || ' ' || coalesce(location, '') || ' ' ||
      coalesce(category, '') || ' ' || coalesce(type, '') || ' ' || coalesce(notes, ''))
  ) stored
);

create table if not exists public.logbook_entries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  title text not null,
  content text,
  entry_at timestamptz not null default now(),
  location text,
  category text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('swedish',
      coalesce(title, '') || ' ' || coalesce(content, '') || ' ' ||
      coalesce(location, '') || ' ' || coalesce(category, ''))
  ) stored
);

create table if not exists public.observation_vehicles (
  observation_id uuid not null references public.observations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (observation_id, vehicle_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_observations_search on public.observations using gin (search);
create index if not exists idx_logbook_search on public.logbook_entries using gin (search);
create index if not exists idx_vehicles_regnr_trgm on public.vehicles using gin (registration_normalized extensions.gin_trgm_ops);
create index if not exists idx_observations_observed_at on public.observations (observed_at desc);
create index if not exists idx_observations_created_by on public.observations (created_by);
create index if not exists idx_logbook_entry_at on public.logbook_entries (entry_at desc);
create index if not exists idx_obsveh_vehicle on public.observation_vehicles (vehicle_id);
create index if not exists idx_obsveh_observation on public.observation_vehicles (observation_id);
create index if not exists idx_audit_created_at on public.audit_logs (created_at desc);
