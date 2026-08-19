-- Publik startsida-inställningar (anon-läsbar) + sponsorer + publik bucket

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  display_name text not null default 'N-BV',
  tagline text,
  tip_phone text,
  logo_path text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;
create policy site_settings_select on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_update on public.site_settings for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_sponsors_order on public.sponsors (sort_order, created_at);
create trigger trg_sponsors_created_by before insert on public.sponsors
  for each row execute function public.set_created_by();
create trigger trg_audit_sponsors after insert or update or delete on public.sponsors
  for each row execute function public.audit_trigger();

alter table public.sponsors enable row level security;
create policy sponsors_select_public on public.sponsors for select to anon using (active);
create policy sponsors_select_auth on public.sponsors for select to authenticated
  using (active or public.is_admin(auth.uid()));
create policy sponsors_insert on public.sponsors for insert to authenticated
  with check (public.is_admin(auth.uid()));
create policy sponsors_update on public.sponsors for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy sponsors_delete on public.sponsors for delete to authenticated
  using (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true)
  on conflict (id) do nothing;
create policy "public-assets insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and public.is_admin(auth.uid()));
create policy "public-assets update" on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and public.is_admin(auth.uid()));
create policy "public-assets delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and public.is_admin(auth.uid()));
