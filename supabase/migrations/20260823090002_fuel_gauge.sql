-- Tankmätare för vaktbilen: singleton-rad (samma mönster som site_settings), bara
-- senaste värdet sparas, ingen historik. Alla aktiva medlemmar får läsa och uppdatera.
create table public.fuel_gauge (
  id integer primary key default 1 check (id = 1),
  level integer not null default 50 check (level between 0 and 100),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.fuel_gauge (id) values (1) on conflict (id) do nothing;
create trigger trg_fuel_gauge_updated before update on public.fuel_gauge
  for each row execute function public.set_updated_at();

alter table public.fuel_gauge enable row level security;
create policy fuel_gauge_select on public.fuel_gauge for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy fuel_gauge_update on public.fuel_gauge for update to authenticated
  using (public.is_active_member(auth.uid()))
  with check (public.is_active_member(auth.uid()) and updated_by = auth.uid());

-- Dashboard-statistiken tas bort från Hem (ersätts av tankmätaren + Körpass-fliken).
drop function if exists public.dashboard_stats();
