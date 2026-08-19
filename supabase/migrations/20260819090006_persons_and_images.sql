-- Personer
create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  first_name text, last_name text, gender text,
  aliases text[] not null default '{}',
  description text, address text, city text, connections text, notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector
);

create or replace function public.persons_search_refresh()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.search := to_tsvector('swedish', concat_ws(' ',
    new.first_name, new.last_name, array_to_string(coalesce(new.aliases, '{}'), ' '),
    new.description, new.address, new.city, new.connections));
  return new;
end;
$$;
revoke all on function public.persons_search_refresh() from public, anon, authenticated;

create trigger trg_persons_search before insert or update on public.persons for each row execute function public.persons_search_refresh();
create trigger trg_persons_created_by before insert on public.persons for each row execute function public.set_created_by();
create trigger trg_persons_updated before update on public.persons for each row execute function public.set_updated_at();
create trigger trg_audit_persons after insert or update or delete on public.persons for each row execute function public.audit_trigger();
create index if not exists idx_persons_search on public.persons using gin (search);
create index if not exists idx_persons_created_by on public.persons (created_by);

create table if not exists public.observation_persons (
  observation_id uuid not null references public.observations(id) on delete cascade,
  person_id uuid not null references public.persons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (observation_id, person_id)
);
create table if not exists public.person_vehicles (
  person_id uuid not null references public.persons(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (person_id, vehicle_id)
);
create index if not exists idx_obsper_person on public.observation_persons (person_id);
create index if not exists idx_pervec_vehicle on public.person_vehicles (vehicle_id);

-- Bildbilagor på observationer
create table if not exists public.observation_images (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations(id) on delete cascade,
  file_path text not null,
  caption text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('swedish', coalesce(caption, ''))) stored
);
create index if not exists idx_obsimg_observation on public.observation_images (observation_id);
create index if not exists idx_obsimg_search on public.observation_images using gin (search);
create trigger trg_audit_obsimg after insert or update or delete on public.observation_images for each row execute function public.audit_trigger();

-- RLS
alter table public.persons enable row level security;
alter table public.observation_persons enable row level security;
alter table public.person_vehicles enable row level security;
alter table public.observation_images enable row level security;

create policy persons_select on public.persons for select to authenticated using (public.is_active_member(auth.uid()));
create policy persons_insert on public.persons for insert to authenticated with check (public.is_active_member(auth.uid()) and created_by = auth.uid());
create policy persons_update on public.persons for update to authenticated
  using (public.is_admin(auth.uid()) or (created_by = auth.uid() and public.within_edit_window(created_at)))
  with check (public.is_admin(auth.uid()) or created_by = auth.uid());
create policy persons_delete on public.persons for delete to authenticated using (public.is_admin(auth.uid()));

create policy obsper_select on public.observation_persons for select to authenticated using (public.is_active_member(auth.uid()));
create policy obsper_insert on public.observation_persons for insert to authenticated
  with check (public.is_admin(auth.uid()) or exists (select 1 from public.observations o where o.id = observation_id and o.created_by = auth.uid()));
create policy obsper_delete on public.observation_persons for delete to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.observations o where o.id = observation_id and o.created_by = auth.uid()));

create policy pervec_select on public.person_vehicles for select to authenticated using (public.is_active_member(auth.uid()));
create policy pervec_insert on public.person_vehicles for insert to authenticated
  with check (public.is_admin(auth.uid()) or exists (select 1 from public.persons p where p.id = person_id and p.created_by = auth.uid()));
create policy pervec_delete on public.person_vehicles for delete to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.persons p where p.id = person_id and p.created_by = auth.uid()));

create policy obsimg_select on public.observation_images for select to authenticated using (public.is_active_member(auth.uid()));
create policy obsimg_insert on public.observation_images for insert to authenticated
  with check (public.is_active_member(auth.uid()) and uploaded_by = auth.uid()
    and (public.is_admin(auth.uid()) or exists (select 1 from public.observations o where o.id = observation_id and o.created_by = auth.uid())));
create policy obsimg_delete on public.observation_images for delete to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.observations o where o.id = observation_id and o.created_by = auth.uid()));

-- Privat bucket för observationsbilder
insert into storage.buckets (id, name, public) values ('observation-images', 'observation-images', false) on conflict (id) do nothing;
create policy "obsimg read" on storage.objects for select to authenticated using (bucket_id = 'observation-images' and public.is_active_member(auth.uid()));
create policy "obsimg insert" on storage.objects for insert to authenticated with check (bucket_id = 'observation-images' and public.is_active_member(auth.uid()));
create policy "obsimg delete" on storage.objects for delete to authenticated using (bucket_id = 'observation-images' and public.is_active_member(auth.uid()));
